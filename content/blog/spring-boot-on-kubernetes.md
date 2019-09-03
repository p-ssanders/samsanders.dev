---
title: "Spring Boot on Kubernetes"
date: 2019-09-03T14:24:06-06:00
draft: true
---

I deployed PKS using a [simple pipeline](https://github.com/p-ssanders/simple-pipelines/tree/master/sandbox/install-pks), and I even created a cluster, but then I kind of didn't know what to do.

> I guess I should deploy an app?

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



create a k8s manifest by exporting
`kubectl get deployment slack-talkers -o yaml --export > k8s-manifest.yml`
`kubectl get service slack-talkers -o yaml --export > k8s-manifest-svc.yml`
(concatenate)

validate it 
`kubectl delete deployment slack-talkers` etc
`kubectl apply -f k8s-manifest.yml`

create some DNS records

want to use a 'secret' to avoid envs on command line or anywhere else
`kubectl create secret generic slack-api-token --from-literal=SLACK_API_TOKEN=<YOUR SLACK API TOKEN>`
```yaml
env:
- name: SLACK_API_TOKEN
    valueFrom:
    secretKeyRef:
        name: slack-api-token
        key: SLACK_API_TOKEN
```

also for the dockerhub login to access a private docker repo
`kubectl create secret docker-registry regcred --docker-server=<your-registry-server> --docker-username=<your-name> --docker-password=<your-pword> --docker-email=<your-email>`
```yaml
imagePullSecrets:
- name: regcred
```

cool.

##  CI/CD
break down the pipeline.yml:

### Test
the first job just runs the tests: `./mvnw test`

if they pass it increments the `Dockertag` semver:
```yaml
- put: docker-tag
params:
    bump: patch
```

### Build
the `Dockertag` semver increment triggers the build job which builds the source, packages the jar, and unzips the jar: `./mvnw -DskipTests package`
a caveat is that we have to use the `docker-tag` resource as an input because the commit it made is not yet visible to other jobs in a given run. that's why we use `cat docker-tag/number > workspace/Dockertag`

notice we didn't build the docker image. `put`ing to the `docker-image` resource triggers the build using the build directory, and the updated `Dockertag` file to specify the tag version, and finally uploads it to Dockerhub

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
Once the image is uploaded to Dockerhub and tagged, it can be used to deploy.

The `deploy` job first downloads the `pks` and `kubectl` CLIs and makes them executable.

Then it logs into the PKS-created cluster.

Then the `k8s-manifest.yml` file is updated _in place_ with the current/latest tag, and used to update the deployment with `kubectl apply`

This triggers a rolling update, and can be observed by running `kubectl get pods`. Notice that the pods get re-created:

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