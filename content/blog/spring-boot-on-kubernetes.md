---
title: "Spring Boot on Kubernetes"
date: 2019-09-03T14:24:06-06:00
draft: false
---

I deployed PKS using a [simple pipeline](https://github.com/p-ssanders/simple-pipelines/tree/master/sandbox/install-pks), and I even created a cluster, but then I kind of didn't know what to do.

I guess I should deploy an app?

I had a simple Spring Boot-based web app called [slack-talkers](https://github.com/p-ssanders/slack-talkers) that worked fine, and didn't have any external dependencies, so it seemed like a good candidate.

How hard could it be?

I could run the app locally, or in the cloud using a simple command:
```
SLACK_API_TOKEN=<YOUR SLACK API TOKEN> ./mvnw spring-boot:run
```

So what next?

## Dockerize

> Kubernetes (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications.

I figured if I could create a Docker image, I could run it on my PKS cluster.

So the first thing I needed to do was [Dockerize](https://docs.docker.com/get-started/) `slack-talkers`.

I read the instructions on the [Spring Boot with Docker](https://spring.io/guides/gs/spring-boot-docker/) guide, and ended up copy/pasting the suggested `Dockerfile` towards the end of the document. I placed the file into the root directory of `slack-talkers`.

I then followed the guide, and updated the `pom.xml` to build a Docker image using Maven:

```bash
./mvnw install dockerfile:build
```

I created a _public_ repository on [DockerHub](https://hub.docker.com/), and pushed my image to it:

```bash
docker login
docker push ssanders0/slack-talkers
```

I didn't care that it was public at that point primarily because there's nothing special about the app, and I wanted to keep things simple by avoiding authentication.

##  Deploy to Kubernetes (Manually)

I searched for things like "deploy docker image to kubernetes" to find that I could deploy a Docker image directly to my Kubernetes cluster using the following command:

```bash
kubectl run slack-talkers --image ssanders0/slack-talkers --port=8080 --env="SLACK_API_TOKEN=${SLACK_API_TOKEN}"
```

Note that the one environment variable `slack-talkers` needs is provided directly in the `run` command.

So that was cool, but in Kubernetes world you need a [Service](https://kubernetes.io/docs/concepts/services-networking/service/) to expose an application running on a set of Pods as a network service i.e.: allow traffic to my web application.

Running the following command creates a service, and even a load balancer in my IaaS that routes traffic to my app:
```bash
kubectl expose deployment slack-talkers --port=80 --target-port=8080 --type="LoadBalancer"
```

Browsing to the load balancer URL then presented my app. Cool! And one DNS `A` record later, and I had a vanity URL. Very cool.

##  Deploy to Kubernetes (via Manifest)

I knew that in Kubernetes world you're supposed to tell Kubernetes how to run your app in a repeatable way through a [configuration file](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/).

I didn't know how to make one of these, but I figured I could probably get one out of Kubernetes since my app was already running.

My app consisted of two Kubernetes concepts: a deployment, and a service. So I exported both:

```bash
kubectl get deployment slack-talkers -o yaml --export > k8s-manifest.yml
kubectl get service slack-talkers -o yaml --export > k8s-manifest-svc.yml
```

I then concatenated the two files together to describe to Kubernetes that I wanted both a deployment, and a service.

I also had to deal with the environment variable, so at first I hard-coded it, but that wouldn't suffice in reality, so I found that Kubernetes has [built-in support for secrets](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-environment-variables). I then had to update my configuration file:

```yaml
env:
- name: SLACK_API_TOKEN
    valueFrom:
    secretKeyRef:
        name: slack-api-token
        key: SLACK_API_TOKEN
```

Then I validated that my configuration file worked to create my deployment and service:

```bash
kubectl create secret generic slack-api-token --from-literal=SLACK_API_TOKEN=...
kubectl delete service slack-talkers
kubectl delete deployment slack-talkers
kubectl apply -f k8s-manifest.yml
```

##  Private Docker Repositories

What about making my Docker Hub repository private? Secrets come in handy for this as well. I followed the [Pull an Image from a Private Registry](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/) guide to create the secret, and update my configuration:

```bash
kubectl create secret docker-registry regcred --docker-server=... --docker-username=<your-name> --docker-password=<your-pword> --docker-email=<your-email>
```

```yaml
imagePullSecrets:
- name: regcred
```

##  CI/CD

So I had an app that ran on my Kubernetes cluster, but what about Continuous Integration and what about Continuous Delivery?

I created a `pipeline.yml` [file](https://github.com/p-ssanders/slack-talkers/blob/master/ci/pipeline.yml) for [Concourse](https://concourse-ci.org/) with three jobs:

1. Test
1. Build
1. Deploy

And it looks like this:

![pipeline](/images/k8s-pipeline-2.png)

### Test

The first job, `test`, runs the tests:
```bash
./mvnw test
```

If the tests pass, the job increments the patch version in a file named `Dockertag` using the [semver resource](https://github.com/concourse/semver-resource):
```yaml
- put: docker-tag
params:
    bump: patch
```

This is to ensure that Kubernetes will deploy the newly-built artifact. If we just use the default tag `latest`, Kubernetes [won't know anything changed](https://stackoverflow.com/questions/53591417/kubernetes-kubectl-apply-does-not-update-pods-when-using-latest-tag), and won't update the deployment.

### Build

The `Dockertag` semver increment triggers the next job, `build`, which builds the source, packages the jar, and unzips the jar:

```bash
./mvnw -DskipTests package
```

A caveat is that we have to use the `docker-tag` resource as an input because the commit it made in the prior job is not yet visible to other jobs in a given run. That's why we use command:

```bash
cat docker-tag/number > workspace/Dockertag
```

Notice that none of this built the docker image.

The Concourse [docker-image-resource](https://github.com/concourse/docker-image-resource) will build the Docker image for us when we `put` to it. The resource builds the image using the specified build directory (and assumes a `Dockerfile` is present). The `Dockertag` file is used to specify the tag version, and finally the resource uploads the resulting image to Dockerhub.

```yaml
- name: docker-image
  type: docker-image
  source:
    repository: ssanders0/slack-talkers
    username: ((dockerhub-username))
    password: ((dockerhub-password))
```

```yaml
- put: docker-image
params:
    build: workspace
    tag_file: workspace/Dockertag
```

### Deploy

Once the image is uploaded to Dockerhub and tagged, it can be deployed.

The `deploy` job first downloads the `pks` and `kubectl` CLIs, and makes them executable.

Then it uses the CLIs to log into the PKS-created cluster.

Then the `k8s-manifest.yml` file is updated _in place_ with the current/latest tag, and used to update the deployment with `kubectl apply`. This interpolation was done to prevent having to keep the Kubernetes configuration file in-sync with the `Dockertag` file.

`kubectl apply` with the updated configuration file triggers a rolling update whichg can be observed by running `kubectl get pods`.

Notice that the pods get re-created:

```bash
$ kubectl get pods # before deployment
NAME                            READY   STATUS    RESTARTS   AGE
slack-talkers-bdbf6994b-4vfds   1/1     Running   0          21m
slack-talkers-bdbf6994b-s9l5w   1/1     Running   0          21m

$ kubectl get pods # after deployment
NAME                            READY   STATUS    RESTARTS   AGE
slack-talkers-dd85cb7d9-htcxq   1/1     Running   0          35s
slack-talkers-dd85cb7d9-slmxz   1/1     Running   0          32s
```
