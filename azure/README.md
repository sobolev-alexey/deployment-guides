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
* name: `my-iota-app-az`
* content: `my-iota-app.azurewebsites.net`

There is probably a web page to perform this action on your registrar, some also provide APIs to perform this operation.

On Cloudflare if you have an account e-mail ($EMAIL) and have been issued the API key ($API-KEY) and Zone ID ($ZONE) for your tld you can run the following script.

```shell
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
-H "X-Auth-Email: $EMAIL" \
-H "X-Auth-Key: $API-KEY" \
-H "Content-Type: application/json" \
--data '{"type":"CNAME","name":"my-iota-app-az","content":"my-iota-app.azurewebsites.net","ttl":1,"priority":10,"proxied":true}'
```

## Custom Domain Name

Once the CNAME mapping has been created you can execute the following command to add the domain name to your Azure web app.

```shell
az webapp config hostname add -g my-iota-app-rg --webapp-name my-iota-app --hostname my-iota-app-az.dag.sh
```

You should now be able to access your site at <https://my-iota-app-az.dag.sh>

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
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
```

Repeat the deploy process, again the deploy will detect the runtime required.

```shell
az webapp up -g my-iota-app-rg -n my-iota-api -l westeurope
```

In your `package.json` we also need to add the `start` script which is run by the new `nodejs` runtime.

```json
    "scripts": {
        "start": "node app.js"
    },
```

No other configuration is necessary the expressjs app will now be available at <https://my-iota-api.azurewebsites.net/>

## Service Domain Name

Repeat the same process as for the main web app, adding CNAME record and then custom domain name, enabling `https-only` and adding a certificate.

```shell
az webapp config hostname add -g my-iota-app-rg --webapp-name my-iota-api --hostname my-iota-api-az.dag.sh
az webapp update -g my-iota-app-rg -n my-iota-app --https-only true
```

Your API will now be available at <https://my-iota-api-az.dag.sh/>

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

There is no additional configuration required to deploy websockets for an application.

## Docker

You first need to create a registry to store your docker images on Azure, if you have not already done so. For more information on the sku option see [Azure SKUs](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-skus). In addition we set admin access for the registry.

```shell
az acr create -n myiotaappreg -g my-iota-app-rg --sku Basic
az acr update -n myiotaappreg --admin-enabled true
```

After creating your `dockerfile` and `.dockerignore` for your application you must build the docker image locally and add to the registry you just created.

```shell
docker build -t myiotaappreg.azurecr.io/my-iota-api:v1 .
```

You can check if it works locally by running.

```shell
docker run -p 3001:3001 myiotaappreg.azurecr.io/my-iota-api:v1
```

Finally push it to the registry.

```shell
docker push myiotaappreg.azurecr.io/my-iota-api:v1
```

You may receive `authentication required` response when pushing to the registry, in which case you will need to run the following.

```shell
az acr login --name myiotaappreg
```

To deploy the container you need to find out the password, you can get it running the following script.

```shell
az acr credential show -n myiotaappreg --query "passwords[0].value"  -o tsv
```

Now that the container is in the registry and you have the credentials you can deploy it with the following script.

```shell
az container create -n my-iota-app-docker -g my-iota-app-rg --image myiotaappreg.azurecr.io/my-iota-api:v1 --registry-username myiotaappreg --registry-password T5fuXA1fbQx9Cc9fH5V0PYama9K/fKCq --dns-name-label my-iota-app-docker --ports 3001
```

Your docker image should now be running at <http://my-iota-app-docker.westeurope.azurecontainer.io:3001> or similar depending on the region you are using.

**There is no automatic method for adding https redirect to the exposed port, instead you will need to great an nginx server with certificate which redirects port 443 to the docker container.**

## Logging

Just about every resource deployed to Azure has associated logging, just login to the portal and take a look at the resource your are interested in.

## Automation/CI

There is an Azure Action for Github, more information can be found in this repo [Azure - Actions](https://github.com/Azure/actions)
