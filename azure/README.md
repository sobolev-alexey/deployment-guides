# Azure

The following describes the steps necessary to deploy a web application to the Azure Platform. You should be able to apply these steps to any existing app but this example demonstrates how to perform all the steps from scratch.

## Pre-requisites

* [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) installed
* [Azure Platform](https://portal.azure.com/) account for your IF login

## Create a new Azure Resource Group

Create a new resource group to organize the different parts of your deployment.

You can create a new resource group on the web app at [Azure - Create Resource Group](https://portal.azure.com/#create/Microsoft.ResourceGroup)

e.g.

* Resource Group Name: `my-iota-app-rg`
* Location: `westeurope`

Or issue the following shell script.

```shell
az group create -n my-iota-app-rg -l westeurope
```

You can find a list of the locations by running.

```shell
az account list-locations
```

Once created you should be able to view your resource group at [Azure - Resource Groups](https://portal.azure.com/#blade/HubsExtension/BrowseResourceGroups)

## Create React App

Create a new react app.

```shell
npx create-react-app my-iota-app
```

and make sure it builds and runs

```shell
cd my-iota-app
npm run build
npm run start
```

## Create Web App

To create your and upload your web app execute the following script. The command will auto-detect that this is using nodejs and set the runtime accordingly.

```shell
az webapp up -g my-iota-app-rg -n my-iota-app -l westeurope
```

The location is optional but if you want to set it you can find a list of the locations by running.

```shell
az account list-locations
```

Once the deployment is complete you should be able to access the deployment at <https://my-iota-app.azurewebsites.net/>

By default the runtime will display `index.html` from the root of your project, but we need to tell it to use a different file for our react app (or alternatively perform the deploy from within the build folder).

Assuming we want to `serve` the prod version from the `build` folder we install the `serve` package.

```shell
npm install serve --save-dev
```

We also we need to tell the deployment to run that script when the instance starts.

```shell
az webapp config set -g my-iota-app-rg -n my-iota-app --startup-file "serve -s build"
```

## DNS Mapping

You must perform the external DNS mapping before adding the domain name to a web app.

You must create a CNAME records for you sub-domain with the DNS registrar for the tld e.g. CloudFlare.

The DNS record should contain the following information.

* type: CNAME
* name: `my-iota-app`
* content: `my-iota-app.azurewebsites.net`

There is probably a web page to perform this action on your registrar, some also provide APIs to perform this operation.

On Cloudflare if you have an account e-mail ($EMAIL) and have been issued the API key ($API-KEY) and Zone ID ($ZONE) for your tld you can run the following script.

```shell
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
-H "X-Auth-Email: $EMAIL" \
-H "X-Auth-Key: $API-KEY" \
-H "Content-Type: application/json" \
--data '{"type":"CNAME","name":"my-iota-app","content":"my-iota-app.azurewebsites.net","ttl":1,"priority":10,"proxied":true}'
```

## Custom Domain Name

Once the CNAME mapping has been created you can execute the following command to add the domain name to your Azure web app.

```shell
az webapp config hostname add -g my-iota-app-rg --webapp-name my-iota-app --hostname my-iota-app.iota.eco
```

You should now be able to access your site at <https://my-iota-app.iota.eco>

At the moment there is no SSL certificate associated with app in Azure settings, but because we setup Cloudflare in proxied mode it automatically gets a valid certificate.

Azure already provides [App Service Managed Certificates](https://github.com/MicrosoftDocs/azure-docs/blob/master/articles/app-service/configure-ssl-certificate.md#create-a-free-certificate-preview) in preview, but they are not currently supported by the CLI.

So for now if you don't use proxy mode in Cloudflare you will have to manually enable the App Service Managed Certificate or obtain a certificate and install it for the domain e.g. Let's Encrypt.

We should also improve the security of the app by setting the `https-only` option.

```shell
az webapp update -g my-iota-app-rg -n my-iota-app --https-only true
```

## Add an expressjs api

Create a new folder for your api e.g. `my-iota-api` and a new `package.json`, then install the `expressjs` package.

Add a simple expressjs server script e.g. `app.js`

```js
const express = require('express')
const app = express()
const port = process.env.PORT || 3000

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
```

Repeat the deploy process, again the deploy will detect the runtime required.

```shell
az webapp up -g my-iota-app-rg -n my-iota-app-api -l westeurope
```

In your `package.json` we also need to add the `start` script which is run by the new `nodejs` runtime.

```json
    "scripts": {
        "start": "node app.js"
    },
```

No other configuration is necessary the expressjs app will now be available at <https://my-iota-app-api.azurewebsites.net/>

## Service Domain Name

Repeat the same process as for the main web app, adding CNAME record and then custom domain name, enabling `https-only` and adding a certificate.

```shell
az webapp config hostname add -g my-iota-app-rg --webapp-name my-iota-api --hostname my-iota-api.iota.eco
```

Your API will now be available at <https://my-iota-app-api-azure.iota.eco/>

## Instances

The App Service Plan specifies how many server instances to utilize, you can scale up/down a plan to provide you with more/less powerful servers.

All apps deployed within the same App Service Plan share the servers.

The App Service Plan has a default of 1 always on instance so no scaling occurs, but there is also an auto-scale setting. You will find the manual and auto options under Scale out in the portal.

To set the amount of manual instances.

```shell
az appservice plan update --name azure_asp_Linux_westeurope_0 -g my-iota-app-rg --number-of-workers 2
```

To script setting auto-scaling follow the tutorials here [Azure - Auto Scaling](https://docs.microsoft.com/bs-latn-ba/azure/virtual-machine-scale-sets/tutorial-autoscale-cli)

You should consider decomissioning App Service plans if you are not using them to save money.

## Websockets

---

## Docker

---

## Logging

---

## Automation/CI

---
