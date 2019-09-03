---
title: "Renew Lets Encrypt Certificates"
date: 2019-08-14T08:33:53-06:00
draft: true
---

So you got the email that says your Let's Encrypt certificates are expiring soon. What do you do?

Renew them.

How?

In this example, I will perform a manual renewal.

1.  List All Certificates 
    ```
    sudo certbot certificates
    ```

1.  

`cat /etc/letsencrypt/renewal/<certname>.conf`

`sudo certbot --help renew`

`sudo certbot renew --cert-name control.fionathebluepittie.com`


`certbot renew` is a non-interactive command, so I get this error:

    ```
    Saving debug log to /var/log/letsencrypt/letsencrypt.log

    - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    Processing /etc/letsencrypt/renewal/control.fionathebluepittie.com.conf
    - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    Cert is due for renewal, auto-renewing...
    Could not choose appropriate plugin: The manual plugin is not working; there may be problems with your existing configuration.
    The error was: PluginError('An authentication script must be provided with --manual-auth-hook when using the manual plugin non-interactively.')
    Attempting to renew cert (control.fionathebluepittie.com) from /etc/letsencrypt/renewal/control.fionathebluepittie.com.conf produced an unexpected error: The manual plugin is not working; there may be problems with your existing configuration.
    The error was: PluginError('An authentication script must be provided with --manual-auth-hook when using the manual plugin non-interactively.'). Skipping.
    All renewal attempts failed. The following certs could not be renewed:
    /etc/letsencrypt/live/control.fionathebluepittie.com/fullchain.pem (failure)
    ```

so...

    https://certbot.eff.org/docs/using.html?#renewing-certificates

    > An alternative form that provides for more fine-grained control over the renewal process (while renewing specified certificates one at a time), is certbot certonly with the complete set of subject domains of a specific certificate specified via -d flags. You may also want to include the -n or --noninteractive flag to prevent blocking on user input (which is useful when running the command from cron).

    `certbot certonly -n -d example.com -d www.example.com`

    > All of the domains covered by the certificate must be specified in this case in order to renew and replace the old certificate rather than obtaining a new one

```
sudo certbot \
-d control.fionathebluepittie.com \
-d *.control.fionathebluepittie.com \
--manual --preferred-challenges dns-01 certonly
```

`certbot` will start an interactive session during which it instructs you to create some DNS TXT records. You should create the records as instructed, but before continuing, make sure those records have propagated using `dig`:

```
dig -t TXT _acme-challenge.control.fionathebluepittie.com
```

If all goes will, `certbot` will save your new certificates to the same location they were previously stored: `/etc/letsencrypt/live/control.fionathebluepittie.com/`



TODO How to automate using `certbot renew`, or why can't I?
