/**
 * Local API token management.
 *
 * Stores token metadata in JSON format with SHA-256 hashes. The plaintext token
 * is returned only at creation or rotation time.
 */
import type { Container } from "../container";
import type { ApiToken, CreateTokenOptions, Permission } from "./types";
export declare class TokenManager {
    private readonly container;
    private readonly tokenFilePath;
    private tokens;
    private readonly lockService;
    private readonly atomicWriter;
    private operationChain;
    constructor(container: Container, tokenFilePath: string);
    initialize(): Promise<void>;
    createToken(options: CreateTokenOptions): Promise<string>;
    validateToken(token: string): Promise<ApiToken | null>;
    listTokens(): Promise<readonly ApiToken[]>;
    revokeToken(tokenId: string): Promise<void>;
    rotateToken(tokenId: string): Promise<string>;
    hasPermission(token: ApiToken, permission: Permission): boolean;
    private generateToken;
    private hashToken;
    private loadTokens;
    private saveTokens;
    private runSerialized;
}
//# sourceMappingURL=token-manager.d.ts.map