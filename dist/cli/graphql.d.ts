import { type GraphqlContext } from "../graphql";
interface GraphqlCliArgs {
    readonly document: string;
    readonly variables?: Readonly<Record<string, unknown>> | undefined;
}
export declare function runGraphqlCli(args: readonly string[], context: GraphqlContext): Promise<void>;
export declare function parseGraphqlCliArgs(args: readonly string[]): Promise<GraphqlCliArgs>;
export declare function normalizeGraphqlDocument(input: string): string;
export {};
//# sourceMappingURL=graphql.d.ts.map