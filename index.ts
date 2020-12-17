import axios, {AxiosInstance} from "axios";

const cheerio = require("cheerio");
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
    CONVERT_URL = "https://ec.nintendo.com/apps/";
    GRAPH_URL = "https://graph.nintendo.com/";
    client: AxiosInstance;
    region: REGION;

    constructor(region: string = "US") {
        this.region = (<any>REGION)[region];
        if (this.region === undefined) throw new Error("Unknown region identifier");
        this.initSession();
    }

    initSession = () => {
        this.client = axios.create({jar: cookieJar} as any);
        this.client.defaults.headers.common = {
            "Accept": "*/*",
        };
    };

    query = async (query, variables) => {
        return await this.client.post(this.GRAPH_URL,
            JSON.stringify({
                query,
                variables,
            }),
        );
    };

    fetchNsuid = async (titleId: string) => {
        const url = this.CONVERT_URL + `${titleId}/${this.region}`;
        const response = await this.client.get(url);
        const redirectLocation = response.request.res.req.path;
        const id = redirectLocation.match(/\d{14}/gm)[0];
        const searchParams = new URLSearchParams(redirectLocation.replace(/.*\?/gm, ""));
        if (!id) throw new Error(`Not a valid NSUID in: ${redirectLocation}`);

        // For future updates in regions read this: https://www.nintendo.com/pos-redirect/70010000012133?a=gdp&c=US
        let language = searchParams.get("l");
        let country = searchParams.get("c");
        language = language && language.toLowerCase() || "en";
        country = country && country.toUpperCase() || "US";

        if (language === "es") {
            country = "LA";
        }

        return {nsuid: id, locale: `${language}-${country}`};
    };

    fetchAll = async (titleId: string) => {
        const {nsuid, locale} = await this.fetchNsuid(titleId);
        try {
            const response = await this.query(`
                query GetGameByNsuid($nsuid: String!, $locale: String) {
                    GetGameByNsuid(nsuid: $nsuid, locale: $locale) {
                        horizontalHeaderImage
                        descriptionImage
                        boxart
                        galleryImages
                    }
                }`,
                {nsuid, locale},
            );
            return response?.data?.data?.GetGameByNsuid;
        } catch (e) {
            console.error(e);
        }
    };

    fetchHeaderImage = async (titleId: string) => {
        const data = await this.fetchAll(titleId);
        return data?.horizontalHeaderImage;
    };

    fetchDescriptionImage = async (titleId: string) => {
        const data = await this.fetchAll(titleId);
        return data?.descriptionImage;
    };

    fetchBoxart = async (titleId: string) => {
        const data = await this.fetchAll(titleId);
        return data?.boxart;
    };

    fetchScreenshots = async (titleId: string) => {
        const data = await this.fetchAll(titleId);
        return data?.galleryImages;
    };
}