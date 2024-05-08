declare namespace NodeJS {
    export interface ProcessEnv {
        TOKEN: string;
        OWNERS: string;
        GUILD_ID: string;
        ADMIN_ROLE_ID: string;
        LOCKS_PATH: string;
    }
}
