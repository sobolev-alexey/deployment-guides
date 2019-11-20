# Google Cloud Platform

The following describes the steps necessary to deploy a web application to the Google Cloud Platform. You should be able to apply these steps to any existing app but this example demonstrates how to perform all the steps from scratch.

## Pre-requisites

* [Google Cloud SDK](https://cloud.google.com/sdk/) installed
* [Google Cloud Platform (GCP)](https://console.cloud.google.com/) account for your IF login

## Create a new Google Cloud Platform project

You can create a new project on the web app at [Google Cloud Platform - New Project](https://console.cloud.google.com/projectcreate)

e.g.

* Project Name: `my-iota-app`
* Project ID: `my-iota-app`
* Organization: `iota.org`
* Location: `iota.org`

The project ID is the property we will use most in future steps and must be unique across the whole GCP environment.

Once created you should be able to view your project at [GCP - Project Settings](https://console.cloud.google.com/iam-admin/settings?project=my-iota-app)

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

## Create App Engine application on GCP

To be able to deploy to the App Engine on GCP you must initialize the features, this only needs performing once.

```shell
gcloud app create --project my-iota-app --region europe-west2
```

To deploy to a different region use one of the values listed from the result of running the following script.

```shell
gcloud app regions list
```

## Settings file app.yaml

The reference for this file can be found here [GCP - app.yaml](https://cloud.google.com/appengine/docs/standard/nodejs/config/appref)

The minimum settings file requires just the runtime property, create one for your application deployment in `/my-iota-app/app.yaml`.

```yaml
runtime: nodejs10
```

## Deploy to GCP

You can now deploy the app with the following command, this will do nothing other than upload the current folder content in the runtime specified in `app.yaml`.

```shell
gcloud app deploy --project my-iota-app --quiet
```

The first time you perform a deploy the `.gcloudignore` file will be created locally, this specifies files to skip when deploying. You can add to this file as required, in the case of a React app we might want to add `public/` and `src/` as we are only interested in deploying the `build` folder.

The app should now be available at [https://my-iota-app.appspot.com](https://my-iota-app.appspot.com)

When you open the site you will see an error, this is because although we have configured the app to run on nodejs we have not implemented any routing.

To fix this add the additional lines to the `app.yaml` file, and the deploy it again.

```yaml
handlers:
- url: /
  static_files: build/index.html
  upload: build/index.html

- url: /(.*)
  static_files: build/\1
  upload: build/(.*)
```

The app should now successfully be running at [https://my-iota-app.appspot.com](https://my-iota-app.appspot.com)

When you update your application just build it locally and run the deploy command again.

## Custom Domain Name

To map a domain name to you application you must first have the tld e.g. `iota.org`, `dag.sh` registered with GCP, this has most likely already been done. Should you need to register a new tld use the following guide [GCP - Custom Domains](https://cloud.google.com/appengine/docs/standard/nodejs/mapping-custom-domains)

## Add GCP Domain Mapping

If you want your app to be available at `my-iota-app.dag.sh` you would execute the following script.

```shell
gcloud app domain-mappings create --project my-iota-app my-iota-app-gcp.dag.sh
```

This will associate the sub-domain with GCP and generate a certificate for it, the certificate can take a few minutes to generate.

You can see the progress of the domain mapping for your project here [GCP - Domains](https://console.cloud.google.com/appengine/settings/domains?project=my-iota-app)

**This only associates the sub-domain with GCP it does not update your DNS server**

## DNS Mapping

You must create a CNAME records for you sub-domain with the DNS registrar for the tld e.g. CloudFlare.

The DNS record should contain the following information.

* type: CNAME
* name: `my-iota-app-gcp`
* content: `ghs.googlehosted.com`

There is probably a web page to perform this action on your registrar, some also provide APIs to perform this operation.

On Cloudflare if you have an account e-mail ($EMAIL) and have been issued the API key ($API-KEY) and Zone ID ($ZONE) for your tld you can run the following script.

```shell
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
-H "X-Auth-Email: $EMAIL" \
-H "X-Auth-Key: $API-KEY" \
-H "Content-Type: application/json" \
--data '{"type":"CNAME","name":"my-iota-app-gcp","content":"ghs.googlehosted.com","ttl":1,"priority":10,"proxied":false}'
```

Once created and your dns update has propogated your app should be available at [https://my-iota-app-gcp.dag.sh](https://my-iota-app-gcp.dag.sh) with a valid certificate.

## Adding a second component

The first deployment to a project has the `default` service name, if you want additional components for example an `api` then you need to start adding the `service` parameter to some of the configuration.

## Add an expressjs api

Create a new folder for your api e.g. `my-iota-api` and a new `package.json`, then install the `expressjs` package.

Add a simple expressjs server script e.g. `app.js`

```js
const express = require('express')
const app = express()
const port = process.env.PORT || 3001;

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
```

Create `app.yaml` for your new `api` service.

```yaml
runtime: nodejs
env: flex
service: api
```

The runtime in this case is `nodejs` and not `nodejs10` and is used in combination with the `flex` environment. With these two settings the runtime will launch the `start` script from your `package.json`.
The service name differentiates your new component from the `default` service that we have already deployed.

In your `package.json` we also need to add the `start` script which is run by the new `nodejs` environment.

```json
    "scripts": {
        "start": "node app.js"
    },
```

You should be able to test it works locally by running `npm run start` and then opening the browser at <http://localhost:3001>

To deploy the new service we use exactly the same script as before from the service folder. It will then use the `service` property from the `app.yaml` to determine where to deploy it.

```shell
gcloud app deploy --project my-iota-app --quiet
```

You will notice on deployment that the progress logging shows different content to our earlier deployment. This is because the `flex` environment effectively does a `docker` deployment for the new service.

Internally in the `docker` container the express server will run on the port specified by the `process.env.PORT` variable, usually 8080. But this port will automaticallly get exposed to the default `https` port 443 for the outside world.

Once deployed the new service will be available at <https://api-dot-my-iota-app.appspot.com/> and you should be able to view the details of both services at [GCP - App Engine Services](https://console.cloud.google.com/appengine/services?project=my-iota-app)

## Service Domain Name

To add a name mapping to the service we also issue the same command as before. Because the `app.yaml` contains the `service` property the new domain gets associated with the new service.

```shell
gcloud app domain-mappings create --project my-iota-app my-iota-api-gcp.dag.sh
```

We also need to add the CNAME record to our DNS as before.

* type: CNAME
* name: `my-iota-api-gcp`
* content: `ghs.googlehosted.com`

Now that we have deployed the service and added the domain we should be able to access the service at <https://my-iota-api-gcp.dag.sh>. However you will notice that you are being served the default react site! We need to create some dispatch rules.

## Dispatch Rules

We must tell the App Engine where to direct the traffic for our different domains.

So we create a `dispatch.yaml` in the folder for the `default` service. The content should be pretty self-explanatory but more details can be found here [GCP - Dispatch Rules](https://cloud.google.com/appengine/docs/standard/nodejs/reference/dispatch-yaml).

```yaml
dispatch:
  - url: "my-iota-app-gcp.dag.sh/*"
    service: default
  - url: "my-iota-api-gcp.dag.sh/*"
    service: api
```

We must then re-run the deploy script for the `default` service (the React app in this demonstration), this time supplying the dispatch rules.

```shell
gcloud app deploy --project my-iota-app dispatch.yaml --quiet
```

Finally the `api` should now be running on <https://my-iota-api-gcp.dag.sh>

## Instances

You can determine how instances of your application are managed with settings in you `app.yaml` file, for detailed explanataion see [GCP - Instances](https://cloud.google.com/appengine/docs/standard/nodejs/how-instances-are-managed)

For example to keep a single always-on instance add the following configuration.

```yaml
manual_scaling:
  instances: 1
```

## Websockets

Websockets are only available in `flex` environments. An additional option should be set to make sure that a websocket connection stays connected to a specific instance.

```yaml
network:
  session_affinity: true
```

## Docker

As you will have seen the `flex` environment is essentially a managed docker deployment, the `runtime` property in `app.yaml` specifies the base docker image it will use.

You can do your own custom docker deployments by setting the `runtime` to `custom` and creating a `dockerfile`.

Example `dockerfile` which launches the expressjs server.

```docker
FROM node:10.13.0-alpine
WORKDIR /usr/src/app
COPY . ./
RUN npm install
EXPOSE 3001
CMD ["node", "app.js"]
```

As a best practice you should also create a `.dockerignore` file to keep the docker container as small as possible.

e.g. `.dockerignore`

```docker
node_modules/
app.yaml
.gcloudignore
```

The rest of the deployment process stays the same.

## Logging

There are a multitude of logs available from deployment to runtime, they are all available here [GCP - Log Viewer](https://console.cloud.google.com/logs/viewer?project=my-iota-app)

## Automation/CI

GCP also has the ability to trigger deployment etc from GitHub using [GCP - CloudBuild](https://cloud.google.com/cloud-build/)
