---
title: "How I Made This"
date: 2019-08-11T09:17:41-06:00
draft: false
---

I wanted to make a website for myself, and to have a place where I could write things. Writing things that are available to the public internet is scary, but I figured it would help keep me honest. I also wanted to learn a new way to make a website. Now that I have one, I can write how I made it.

<!--more-->

### Domain

The first thing I did was get the domain: `samsanders.dev`.

According to Google, the `.dev` TLD is:

> A domain just for developers

> From tools to platforms, languages to blogs, .dev is a home for all the interesting things that you build. .dev lets your clients know what you do before they even open your site.

Sounds about right for my use case, so I used [Google Domains](https://domains.google/) to purchase it.

The one caveat of using a `.dev` domain is they're automatically added to Chrome's [HSTS preload list](https://hstspreload.org/), so HTTPS is required on all connections. This implies you need an SSL certificate. Works for me.


### Hosting

I knew that you could use [AWS](https://aws.amazon.com/) to host a website, specifically with [Amazon S3](https://aws.amazon.com/s3/), but I didn't really know _how_ that worked.

I first read the document [Web Hosting](https://aws.amazon.com/websites/). This confirmed that S3 was a viable solution.

I followed [this walkthough](https://docs.aws.amazon.com/AmazonS3/latest/dev/HostingWebsiteOnS3Setup.html) to prove the concept to myself with a throwaway `index.html` document.


### Static Site Generator

I had a domain, and a way to host my site. Now I needed a way to build the site. I wanted a simple page to introduce myself, and the potential to make a blog.

I knew about static site generators, e.g.: [Jekyll](https://jekyllrb.com/), so I did some research to learn more.

Eventually I decided to use [Hugo](https://gohugo.io/) which seemed to be the top contender to Jekyll, but won me over because it's written in Go, and therefore it's just a binary you put somewhere on your `PATH`.

I liked the idea of themes, so I didn't have to write much HTML or CSS, and instead could just focus on content by writing some markdown.

It didn't exactly work out that way, but a lot the work was done for me by choosing a theme. To start I went with the [Hallo](https://themes.gohugo.io/hallo-hugo/) theme. Simple, clean, and served my initial requirement of wanting to make a simple website for myself. It didn't, however, have any blog capabilities.

Now I could build the site, upload it to my S3 bucket, and see it when I browsed to the bucket URL.


### Source Control

My first commit was just a working Hugo build with the Hallo theme. I pushed this up to [GitHub](https://github.com/southp4w/samsanders.dev) so I could have the code available to myself wherever I was.


### TLS Certificates

Before I could use my custom `.dev` domain, I needed TLS certificates. I'm a fan of [Let's Encrypt](https://letsencrypt.org/), mostly because it's free.

I created a Hosted Zone in Amazon Route 53 for `samsanders.dev`. I then updated my Google Domains name servers to the ones assigned by Amazon to my Hosted Zone.

I generated certificates using `certbot`:

```
sudo certbot \
  --server https://acme-v02.api.letsencrypt.org/directory \
  -d samsanders.dev \
  -d *.samsanders.dev \
  --manual --preferred-challenges dns-01 certonly
```

### Using a Custom Domain

I wanted to use `samsanders.dev`, but S3 doesn't have any features that support TLS. I did some research and found that [Amazon CloudFront](https://aws.amazon.com/cloudfront/) is the [suggested solution](https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-https-requests-s3/) to this problem.

It seems like a big solution to a small problem (i.e.: I didn't _need_ a CDN), but it also seemed simple to implement, cheap, and valid.

So I setup a CloudFront distribution with my Let's Encrypt certificates, and created DNS entries to point to the distribution. Since my certificate includes the wildcard domain `*.samsanders.dev`, I created a CNAME record for `www.` and an A record for the apex domain. Route53 allows you to create A records for apex domains that point to CloudFront distributions (instead of IP addresses), which is a really cool feature.

After a lot of waiting for AWS, I had a static site served at `https://samsanders.dev` with valid certificates. Cool!


### CI/CD

I wanted a way to rollout changes to my site when I pushed new commits to GitHub. I did some research, and found that Amazon offers [AWS CodePipeline](https://aws.amazon.com/codepipeline/).

I setup a pipeline with a Source stage that polled my GitHub repository, and a Deploy stage that pushed to my S3 bucket.

But it didn't work ☹

The integration was fine: I could push to GitHub to trigger a deployment. But the site was broken.

When Hugo builds your site, it creates (by default), a folder called `public` in which your publishable site lives. But when AWS CodePipeline has a Source, and Deploy stage, everything in the repository gets copied to the bucket. I just wanted the `public` folder copied.

Luckily, Amazon has [AWS CodeBuild](https://aws.amazon.com/codebuild/) for building code. So I made a build project that ran some commands I typed directly into the build project. I wired the build project into the CodePipeline by adding a Build stage.

Again, the integration worked fine, but the build didn't do what I wanted. I researched the [Buildspec](https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html) concept within AWS, and dediced to make a [buildspec.yml](https://github.com/southp4w/samsanders.dev/blob/master/buildspec.yml) file that would live in the root directory of my repository, and instruct CodeBuild.

I liked this solution because I wanted my build in source control, and since I was still comitting the `public` directory to GitHub, the `buildspec.yml` was very simple: it made sure to copy only the `public` folder.

I tried migrating the Hugo build to CodeBuild, but I'm using the [git submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules) approach to Hugo themes, and CodeBuild doesn't have great support for that use case yet. The solution is to do the `git clone` yourself via the `buildspec.yml` so that you can also clone the submodule. Yuck. But it's on my TODO list.

### Blog

My site worked, and my theme was sufficient for a personal landing page. But it didn't have blog capability.

I searched for Hugo themes that did have blog capabilities, hoping I could install another theme via submodule, and use it when using the `hugo new` command to create blog posts.

I didn't find any blog themes I loved, so I decided to learn more Hugo so I could make my own blog.

I read the Hugo docs, and created a `blog` folder with an `_index.md` file inside it. I created default layouts for `list` types, and `single` types for the blog index, and the individual blog post pages, respectively. I used [Heather Hugo](https://themes.gohugo.io/heather-hugo/) as my primary design inspiration.

I added some navigation to get to the blog from the landing page, and back.

There was definitely a learning curve with Hugo, and its terminology, but now I have a site with a cool domain, and simple landing page, and place where I can write things down. Plus all traffic to it is secure!

