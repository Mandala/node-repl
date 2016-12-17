/**
 * TypeScript definition for Setlist
 * Copyright (c) 2016 Fadhli Dzil Ikram
 */



declare module 're-pl' {
  interface Session {
    (input?: any): Promise<any>
  }

  function repl ($eval: Function): Session

  export = repl
}