#   samsanders.dev

Personal website built with Hugo.

### Generate Certificates

```
sudo certbot \
        --server https://acme-v02.api.letsencrypt.org/directory \
        -d samsanders.dev \
        -d *.samsanders.dev \
        --manual --preferred-challenges dns-01 certonly
```

### Setup
*   GitHub
*   S3
*   CodeBuild
*   CodePipeline
*   Cloudfront
