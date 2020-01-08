# Amazon AWS

The following describes the steps necessary to deploy a web application to the AWS Platform. You should be able to apply these steps to any existing app but this example demonstrates how to perform all the steps from scratch.

## Pre-requisites

* [AWS CLI](https://aws.amazon.com/cli/) installed
* [AWS Elastic Beanstalk CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) installed
* [Amazon Web Services](https://eu-central-1.console.aws.amazon.com/) account for your IF login

## Create a new AWS Resource Group

To better manage your project it is good practice to store all associated components in a resource group.

You can create a new resource group on the web app at [AWS - Resource Groups](https://eu-central-1.console.aws.amazon.com/resource-groups/groups/new)

The resource group is just a query of all other AWS resources that have specific tags applied to them. In our example we create the resource group so that it will find any other components that have a key/value tag of `iota-project=my-iota-app`

Or with the CLI

```shell
aws resource-groups create-group --name my-iota-app-rg --resource-query '{"Type":"TAG_FILTERS_1_0","Query":"{\"ResourceTypeFilters\":[\"AWS::AllSupported\"],\"TagFilters\":[{\"Key\":\"iota-project\",\"Values\":[\"my-iota-app\"]}]}"}'
```

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

## Create Application on AWS Elastic Beanstalk

To be able to deploy to the Elastic Beanstalk you simply create an application as follows, this is really just a placeholder which will contain an `environment`.

```shell
aws elasticbeanstalk create-application --application-name my-iota-app --tags Key=iota-project,Value=my-iota-app
```

To see a list of the stack names see [AWS - Supported Platforms](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts.platforms.html) or run `aws elasticbeanstalk list-available-solution-stacks`

## Elastic Beanstalk configuration

Within the folder for your application run the following script to initialize the Elastic Beanstalk configuration.

```shell
eb init -i my-iota-app -p node.js --tags iota-project=my-iota-app
```

When prompted choose selected the following properties:

* location: eu-central-1
* ssh: no

On completion this will have created a local file `./elasticbeanstalk/config.yml`

```yaml
branch-defaults:
  default:
    environment: null
global:
  application_name: my-iota-app
  branch: null
  default_ec2_keyname: null
  default_platform: node.js
  default_region: eu-central-1
  include_git_submodules: true
  instance_profile: null
  platform_name: null
  platform_version: null
  profile: null
  repository: null
  sc: null
  workspace_type: Application
```

## Deploy

We can now deploy the app and supply the name of the environment we want to use (this could be something like dev/prod etc). The cname specifies what the resulting access url will be (if you don't provide a cname you will be allocated a random url based on the env name).

```shell
eb create my-iota-app-dev --cname my-iota-app --tags iota-project=my-iota-app
```

The script will generate a zip file in `./elasticbeanstalk/app_versions/<TIMESTAMP>.zip` which it then uploads and finally deletes (if you are quick you can open the zip file to see its contents, this is a good way to check that it is only uploading the necessary content). It will then continue to show logging for the deployment until it completes. This will be slow on the first deploy as it configured the rest of the AWS infrastructure it requires (load balancers, security groups etc).

The app should now successfully be running at [http://my-iota-app.eu-central-1.elasticbeanstalk.com](http://my-iota-app.eu-central-1.elasticbeanstalk.com)

When you update your application you can just issue the following command to re-deploy.

```shell
eb deploy
```

By default the node.js environment will run the `start` script. But for our react app we want to run the production build. To make this happen we do a local build of the application `npm run build` and upload only the build folder and execute `serve` instead.

Add the `serve` package as a `dependency` with `npm install serve --save` we install this as a regular dependency as the runtime environment executes the instance npm install with the production flag set.

Add a new `package.json` script to serve the build folder.

```json
    "scripts": {
        "serve-default": "serve -s build"
    },
```

Add `.ebignore` file so that only the build folder is included on deployment.

```shell
node_modules
public
src
```

Now we customize the Elastic Beanstalk by adding a script that the runtime will execute on startup `./ebextensions/node.config`

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm run serve"
```

After running `eb deploy` again your production build will be available at [http://my-iota-app.eu-central-1.elasticbeanstalk.com](http://my-iota-app.eu-central-1.elasticbeanstalk.com)

## DNS Mapping

You must create a CNAME records for you sub-domain with the DNS registrar for the tld e.g. CloudFlare.

The DNS record should contain the following information.

* type: CNAME
* name: `my-iota-app-aws`
* content: `my-iota-app.eu-central-1.elasticbeanstalk.com`

There is probably a web page to perform this action on your registrar, some also provide APIs to perform this operation.

On Cloudflare if you have an account e-mail ($EMAIL) and have been issued the API key ($API-KEY) and Zone ID ($ZONE) for your tld you can run the following script.

```shell
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
-H "X-Auth-Email: $EMAIL" \
-H "X-Auth-Key: $API-KEY" \
-H "Content-Type: application/json" \
--data '{"type":"CNAME","name":"my-iota-app-aws","content":"my-iota-app.eu-central-1.elasticbeanstalk.com","ttl":1,"priority":10,"proxied":false}'
```

Once created and your dns update has propogated your app should be available at [http://my-iota-app-aws.dag.sh](http://my-iota-app-aws.dag.sh).

## Adding a certificate

See the section [Adding wildcard certificate](#adding-wildcard-certificate) to first add a certificate for the tld e.g dag.sh

The way that the infrastructure is setup on AWS means your application is already created behind a load balancer, so it is actually the load balancer that we need to add the certificate to.

We need the arn of the wildcard certificate, then we create the extra settings file in the application `./ebextensions/classic-secure-listener.config`

```yaml
option_settings:
  aws:elb:listener:443:
    ListenerProtocol: HTTPS
    SSLCertificateId: arn:aws:acm:eu-central-1:837089879979:certificate/e39912f0-c893-4cba-9a4a-ce52a30d1a3a
    InstancePort: 80
    InstanceProtocol: HTTP
```

Then redeploy the app with `eb deploy`.

## Add an expressjs api

To add the API we are effectively setting up a complete new application.

Create a new folder for your api e.g. `my-iota-api` and a new `package.json`, then install the `expressjs` package.

Add a simple expressjs server script e.g. `app.js`

```js
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
```

Create and deploy the new application.

```shell
aws elasticbeanstalk create-application --application-name my-iota-api --tags Key=iota-project,Value=my-iota-api

eb init -i my-iota-api -p node.js --tags iota-project=my-iota-api

eb create my-iota-api-dev --cname my-iota-api --tags iota-project=my-iota-api
```

Create the DNS record

```shell
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
-H "X-Auth-Email: $EMAIL" \
-H "X-Auth-Key: $API-KEY" \
-H "Content-Type: application/json" \
--data '{"type":"CNAME","name":"my-iota-api-aws","content":"my-iota-api.eu-central-1.elasticbeanstalk.com","ttl":1,"priority":10,"proxied":false}'
```

Add the `./ebextensions/classic-secure-listener.config` file as described earlier.

Redeploy `eb deploy`

The expressjs app will now be available at <https://my-iota-api-aws.dag.sh/>

## Instances

The Elastic Beanstalk environment has a very powerful instance management setup.

By default your configuration will have a load-balanced auto-scaling group which scales between 1 and 4 instances depending on load.

For more details on how to configure the instance management see [AWS - Auto Scaling Groups](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.managing.as.html)

## Websockets

There is no additional configuration required to deploy websockets for an application.

## Docker

There are a lot of steps to run a docker container in AWS, the following tutorials will guide you.

* [http://okigiveup.net/discovering-aws-with-the-cli-part-2-ecs-and-fargate/](http://okigiveup.net/discovering-aws-with-the-cli-part-2-ecs-and-fargate/)
* [https://medium.com/boltops/gentle-introduction-to-how-aws-ecs-works-with-example-tutorial-cea3d27ce63d](https://medium.com/boltops/gentle-introduction-to-how-aws-ecs-works-with-example-tutorial-cea3d27ce63d)

## Logging

Just about every resource deployed to AWS has associated logging, just login to the portal and take a look at the resource your are interested in.

## Automation

For more on CI integration for GitHub see [https://aws.amazon.com/blogs/devops/aws-developer-tools-expands-integration-to-include-github/](https://aws.amazon.com/blogs/devops/aws-developer-tools-expands-integration-to-include-github/)

## Adding wildcard certificate

To allow applications to run over https we can create a wildcard domain certificate e.g. *.dag.sh using the following steps in the Amazon Certificate Manager (ACM).

```shell
aws acm request-certificate --domain-name *.dag.sh --validation-method DNS
```

On completion the request returns the arn for the certificate.

```json
{
    "CertificateArn": "arn:aws:acm:eu-central-1:837089879979:certificate/e39912f0-c893-4cba-9a4a-ce52a30d1a3a"
}
```

Since we have chosen DNS as the validation method for the domain, we need to add an additional CNAME records so that ACM can validate it.

To find out what the CNAME record we need to add consists of, execute the following script using the arn returned by the request command.

```shell
aws acm describe-certificate --certificate-arn arn:aws:acm:eu-central-1:837089879979:certificate/e39912f0-c893-4cba-9a4a-ce52a30d1a3a
```

The response should be something like:

```json
{
    "Certificate": {
        "CertificateArn": "arn:aws:acm:eu-central-1:837089879979:certificate/e39912f0-c893-4cba-9a4a-ce52a30d1a3a",             "DomainName": "*.dag.sh",
        "SubjectAlternativeNames": [
            "*.dag.sh"
        ],
        "DomainValidationOptions": [
            {
                "DomainName": "*.dag.sh",
                "ValidationDomain": "*.dag.sh",
                "ValidationStatus": "PENDING_VALIDATION",
                "ResourceRecord": {
                    "Name": "_88c7461be89dd122358b42e760d7e6e8.dag.sh.",
                    "Type": "CNAME",
                    "Value": "_d6ab650129e4f68a2fde7647cbfcd3e4.kirrbxfjtw.acm-validations.aws."
                },
                "ValidationMethod": "DNS"
            }
        ],
        "Subject": "CN=*.dag.sh",
        "Issuer": "Amazon",
        "CreatedAt": 1574760049.0,
        "Status": "PENDING_VALIDATION",
        "KeyAlgorithm": "RSA-2048",
        "SignatureAlgorithm": "SHA256WITHRSA",
        "InUseBy": [],
        "Type": "AMAZON_ISSUED",
        "KeyUsages": [],
        "ExtendedKeyUsages": [],
        "RenewalEligibility": "INELIGIBLE",
        "Options": {
            "CertificateTransparencyLoggingPreference": "ENABLED"
        }
    }
}
```

You can see the `DomainValidationOptions` property contains the details of the CNAME record you need to add. Add this to your DNS provider in the same way as the main CNAME record e.g.

```shell
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
-H "X-Auth-Email: $EMAIL" \
-H "X-Auth-Key: $API-KEY" \
-H "Content-Type: application/json" \
--data '{"type":"CNAME","name":"_88c7461be89dd122358b42e760d7e6e8","content":"_d6ab650129e4f68a2fde7647cbfcd3e4.kirrbxfjtw.acm-validations.aws","ttl":1,"priority":10,"proxied":false}'
```

AWS will automatically perform the validation check in the background for the certificate.
