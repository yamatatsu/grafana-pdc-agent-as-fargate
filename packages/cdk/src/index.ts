import * as cdk from "aws-cdk-lib";
import { BackendStack } from "./backend";

const app = new cdk.App();

new BackendStack(app, "GrafanaPdcDemoBackend", {});
