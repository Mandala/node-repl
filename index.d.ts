/**
 * TypeScript definition for Setlist
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */



declare module 're-pl' {
  interface Session {
    (input?: any): Promise<any>
  }

  interface EvalFunction {
    (ev: any): any
  }

  function repl ($eval: EvalFunction): Session

  export = repl
}