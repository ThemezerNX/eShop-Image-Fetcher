import axios, {AxiosInstance} from "axios";
import {readFileSync} from "fs";
require('dotenv').config()

const https = require("https");
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = null;

enum REGION {
    US = "US",
    GB = "GB",
    JP = "JP",
    AU = "AU",
    TW = "TW",
    KR = "KR",
    // CN = "CN",?
    // EU = "EU",?
}

export default class Fetcher {
    SERVER_ENV = "lp1";
    DEVICE_ID = "DEVUNIT000072992";
    FIRMWARE_VERSION = "11.0.1-2";
    PLATFORM = "NX";

    CERT_PATH = "./nx_tls_client_cert.pem";
    SHOP_CERT_PATH = "./libAppletShop.p12";
    SHOP_CERT_PASSWORD = "kei8paraeS";
    BASE_URL = "https://bugyo.hac.lp1.eshop.nintendo.net/shogun/v1/titles/";

    session: AxiosInstance;
    region: REGION;

    constructor(region: string = "US") {
        this.region = (<any>REGION)[region];
        if (this.region === undefined) throw new Error("Unknown region identifier");
        this.initSession();
    }

    initSession = () => {
        const httpsAgent = new https.Agent({
            // cert: readFileSync(this.CERT_PATH),
            // pem: readFileSync(this.CERT_PATH),
            pfx: readFileSync(this.SHOP_CERT_PATH),
            passphrase: this.SHOP_CERT_PASSWORD,
            rejectUnauthorized: false,
        });

        this.session = axios.create({httpsAgent, jar: cookieJar} as any);
        // this.session.defaults.headers.common[
        //     "User-Agent"
        //     ] = `NintendoSDK Firmware/${this.FIRMWARE_VERSION} (platform:${this.PLATFORM}; did:${this.DEVICE_ID}; eid:${this.SERVER_ENV})`;
        this.session.defaults.headers.common = {
            "X-DeviceAuthorization": `Bearer ${readFileSync(`./auth/device_auth_token.txt`)}`,
            "Accept": "*/*",
        };
    };

    refreshToken = async () => {

    };

    fetch = async (titleId: string) => {
        const url = this.BASE_URL + `${titleId}?shop_id=3&lang=en&country=${this.region}`;
        try {
            const response = await this.session.get(url);
            return response;
        } catch (e) {
            console.error(e);
            console.log(e.response.data);
            if (e.response.status === 403) {
                console.info("Oops! The DAuth is invalid. Refreshing it now...");
                // throw new Error("Oops! The DAuth is invalid. Please refresh it.")
                // TODO: Refresh token here //
            } else return null;
        }
    };

}