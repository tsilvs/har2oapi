/**
 * My default error handler.
 * @param msg {String} Custom error message
 * @param code {number} Custom exit code
 * @param exitOnError {Bollean} Exit on error switch
 * @param err {Error} Error object
*/

export const erh = (msg?: string) => (code: number = 1) => (exitOnError: boolean = true) => (err: Error): void => { console.error(`${msg ? `${msg}\n${err.message}` : err.message}`); exitOnError && process.exit(code) }
/**
 * Call this to throw and catch an error when 3rd party doesn't.
 * @param msg
 * @param erhmc Error handling function
 * @returns void
*/
export const thr = (msg?: string) => (erhmc: Function): void => { try { throw new Error(msg)}  catch (err) { erhmc(err)}  }

