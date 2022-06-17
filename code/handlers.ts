import https from "https";
import url from "url";
import { CdkCustomResourceEvent, CdkCustomResourceResponse, Context } from "aws-lambda";

export function app() {
    console.log('Hello world!');
    console.log('Pretending to connect to', process.env.RDS_HOST);
}

export function runMigrations(event: CdkCustomResourceEvent, context: Context) {
    console.log('Pretending to connect to', process.env.RDS_HOST, 'to run migrations!');
    send(event, context, 'SUCCESS');
}

// cfn-response from https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-lambda-function-code-cfnresponsemodule.html
// Modified to Typescript by Jon Winsley
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
 
function send(event: CdkCustomResourceEvent, context: Context, responseStatus: 'SUCCESS'|'FAILED', responseData?: object, physicalResourceId?: string, noEcho?: boolean) {
 
    const response: CdkCustomResourceResponse = {
        Status: responseStatus,
        Reason: 'See the details in CloudWatch Log Stream: ' + context.logStreamName,
        PhysicalResourceId: physicalResourceId ?? context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        NoEcho: noEcho ?? false,
        Data: responseData
    };

    const responseBody = JSON.stringify(response);
 
    console.log('Response body:\n', responseBody);
 
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'content-type': '',
            'content-length': responseBody.length
        }
    };
 
    const request = https.request(options, function(response) {
        console.log('Status code: ' + response.statusCode);
        console.log('Status message: ' + response.statusMessage);
        context.done();
    });
 
    request.on('error', function(error) {
        console.log('send(..) failed executing https.request(..): ' + error);
        context.done();
    });
 
    request.write(responseBody);
    request.end();
}