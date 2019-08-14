---
title: "Build vs Buy"
date: 2019-08-13T16:07:26-06:00
draft: false
---

I have a bias to buy rather than build. I have this bias primarily because when buying is even an option, then you can infer that there's a market for that product.

So you have to ask:

> "Is my core business competing in that market?"

If the answer is "No," that is, if your core business isn't in the market of building products like the one you're considering building, then the decision to build is hard to justify.

DIYing products that aren't part of your core business costs time, money, people, and never stops costing until it's no longer in production. Just like any other product, your product will need patches, new features, it will have technical debt. And none of it generates revenue. In fact, it generates expense and distraction from market opportunities.

Take for example, Cloud Platforms.

The company I work for, [Pivotal](https://pivotal.io/), or rather their flagship product, [Pivotal Cloud Foundry](https://pivotal.io/platform), is often the object of this type of "Build vs Buy" discussion.

Before Pivotal, I worked at a place that decided to build their own cloud platform without even considering buying. I think they were biased toward build, however, because they DIY'd most things, and had a suite of tools and services that didn't directly generate revenue. And as you would expect, those tools and services instead generated expense and distraction from market opportunities. At the time I had no idea how to build a cloud platform. I knew what [Heroku](https://www.heroku.com/) was, and it definitely did not seem trivial, or even realistic to try to build.

I wondered:

> Why would anyone try to build their own _cloud platform_? Who even knows what it takes to build a cloud platform? I guess people that have spent years working at a cloud platform company know, but none of the people here have that background.

I took this table of what are essentially responsibilities and capabilities that a platform must have and provide from a Pivotal white paper called [The Upside Down Economics of Building Your Own Platform](https://content.pivotal.io/white-papers/the-upside-down-economics-of-building-your-own-platform):

| Infrastructure                                                                  | Operations                      | Deployment                            | Application Services              | Security               |
|---------------------------------------------------------------------------------|---------------------------------|---------------------------------------|-----------------------------------|------------------------|
| Container Orchestration                                                         | Service Monitoring              | Application Lifecycle Management      | Self-Service Provisioning         | Audit & Compliance     |
| Infrastructure Orchestration                                                    | Dependency Management           | Release Packaging & Deployment        | Application Runtimes & Frameworks | Incident Management    |
| Configuration Management                                                        | Inventory & Capacity Management | CI/CD                                 | Databases                         | Secrets Management     |
| Core IaaS (DNS, Load Balancers, Network, Compute, Storage, Firewalls, VPN, etc) | Event Management                | Artifact Repository                   | HTTP Proxies                      | Certificate Management |
|                                                                                 | Persistent Team Chat            | Build & Configuration Standardization | Caches                            | Identity Management    |
|                                                                                 | Metrics & Visualization         | Source Control Management             | Messaging                         | Vulnerability Scanning |
|                                                                                 | Log Aggregation & Indexing      |                                       |                                   | Network Security       |
|                                                                                 | Metrics Storage                 |                                       |                                   |                        |
|                                                                                 |                                 |                                       |                                   |                        |

**Wow.**

Well, [Kubernetes](https://kubernetes.io/) certainly doesn't do _all that_.

But there are companies, like Pivotal in this example, that have built a product that can bear those responsibilities, and provide those capabilities. Today. Now.

So how do you justify committing the time, the energy, and the people to building something that even comes close to that when your primary business is something other than that?
