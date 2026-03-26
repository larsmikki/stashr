declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  interface Database {
    run(sql: string, params?: Record<string, unknown>): void;
    exec(sql: string, params?: Record<string, unknown>): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  export type { Database, QueryExecResult, SqlJsStatic };
  export default function initSqlJs(): Promise<SqlJsStatic>;
}
