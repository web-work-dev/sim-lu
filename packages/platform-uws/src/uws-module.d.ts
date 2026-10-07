declare module "uWebSockets.js" {
    export function App(): unknown;
    export function us_listen_socket_close(socket: object): void;

    const uws: {
        App: typeof App;
        us_listen_socket_close: typeof us_listen_socket_close;
    };

    export default uws;
}
