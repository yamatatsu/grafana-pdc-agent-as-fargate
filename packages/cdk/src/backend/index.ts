import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";
import { GrafanaPdcAgent } from "./grafana-pdc-agent";
import { Vpc } from "./vpc";

type Props = cdk.StackProps & {};
export class BackendStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: Props) {
		super(scope, id, props);

		const vpc = new Vpc(this, "Vpc");

		const grafanaPdcAgent = new GrafanaPdcAgent(this, "GrafanaPdcAgent", {
			...props,
			vpc: vpc.vpc,
		});
		vpc.allowOutboundFrom(grafanaPdcAgent.fargateConnections);
	}
}
