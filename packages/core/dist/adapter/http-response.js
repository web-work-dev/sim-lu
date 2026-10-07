export class MutableHttpResponse {
    currentStatus = 200;
    currentBody = undefined;
    headerStore = {};
    cookieStore = {};
    get status() {
        return this.currentStatus;
    }
    get body() {
        return this.currentBody;
    }
    get headers() {
        return this.headerStore;
    }
    get cookies() {
        return this.cookieStore;
    }
    setStatus(status) {
        this.currentStatus = status;
        return this;
    }
    setHeader(name, value) {
        this.headerStore[name.toLowerCase()] = value;
        return this;
    }
    send(body) {
        this.currentBody = body;
        return this;
    }
    setCookie = (name, value, _options) => {
        this.cookieStore[name] = value;
    };
    clearCookie = (name, _options) => {
        delete this.cookieStore[name];
    };
}
//# sourceMappingURL=http-response.js.map