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

## Custom Domain Name

---

## DNS Mapping

---

## Add an expressjs api

---

## Service Domain Name

---

## Instances

---

## Websockets

---

## Docker

---

## Logging

---

## Automation/CI

---
