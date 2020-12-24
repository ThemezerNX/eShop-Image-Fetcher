import axios, {AxiosInstance} from "axios";

const cheerio = require("cheerio");
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = null;

enum REGION {
    // Americas
    US = "US",
    CA = "CA",
    // LA = "LA",
    BR = "BR",
    CO = "CO",
    AR = "AR",
    CL = "CL",
    PE = "PE",

    // Asia Pacific
    JP = "JP",
    KR = "KR",
    CN = "CN",
    TW = "TW",
    HK = "HK",
    AU = "AU",
    NZ = "NZ",

    // Europe, Middle East & Africa
    AT = "AT",
    BE = "BE",
    CZ = "CZ",
    DK = "DK",
    DE = "DE",
    ES = "ES",
    FI = "FI",
    FR = "FR",
    HU = "HU",
    IL = "IL",
    IT = "IT",
    NL = "NL",
    NO = "NO",
    SK = "SK",
    PL = "PL",
    PT = "PT",
    RU = "RU",
    ZA = "ZA",
    SE = "SE",
    CH = "CH",
    GB = "GB",
}

const graphQLRegions = [
    REGION.US,
    REGION.CA,
    REGION.BR,
    REGION.CO,
    REGION.AR,
    REGION.CL,
    REGION.PE,
];


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

    fetchNsuid = async (titleId: string, region: string) => {
        const url = this.CONVERT_URL + `${titleId}/${region}`;
        let response = null;
        try {
            response = await this.client.get(url);
        } catch (e) {
            throw new Error("Title not found");
        }
        const redirectLocation = response.request.res.req.path;
        const nsuid = redirectLocation.match(/\d{14}/gm)[0];
        const searchParams = new URLSearchParams(redirectLocation.replace(/.*\?/gm, ""));

        if (nsuid) {
            // For future updates in regions read this: https://www.nintendo.com/pos-redirect/70010000012133?a=gdp&c=US
            let language = searchParams.get("l");
            let country = searchParams.get("c");
            language = language && language.toLowerCase() || "en";
            country = country && country.toUpperCase() || "US";

            if (language === "es") {
                country = "LA";
            }

            return {nsuid, locale: `${language}-${country}`};
        } else {
            console.error(`Not a valid NSUID in: ${redirectLocation}`);
        }
    };

    fetchHtml = async (titleId: string, region: string) => {
        const url = this.CONVERT_URL + `${titleId}/${region}`;
        try {
            const response = await this.client.get(url);
            // console.log(response.data);
            if (response?.data?.includes("ApolloClient")) {
                console.log(`The region '${region}' has a GraphQL endpoint!`);
                throw new Error();
            } else {
                return cheerio.load(response.data);
            }
        } catch (e) {
            // console.log(e);
            throw new Error("Title not found");
        }
    };

    chooseSource = async (titleId: string, region: REGION = this.region) => {
        if (graphQLRegions.includes(region)) {
            // Query Nintendo's official GraphQL API
            const {nsuid, locale} = await this.fetchNsuid(titleId, region.toString());
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
            const game = response?.data?.data?.GetGameByNsuid;
            return {
                horizontalHeaderImage: game?.horizontalHeaderImage,
                descriptionImage: game?.descriptionImage,
                boxart: game?.boxart,
                galleryImages: game?.galleryImages,
            };
        } else {
            // Get the page's 'twitter:image' meta tag
            const $ = await this.fetchHtml(titleId, region.toString());
            const horizontalHeaderImage = $("meta[property='og:image']").attr("content");
            if (horizontalHeaderImage.includes("og_nintendo.png") || // nintendo's logo
                horizontalHeaderImage.includes("2x1") // not 16:9
            ) {
                throw new Error("Not the correct image");
            }
            return {
                horizontalHeaderImage: horizontalHeaderImage,
            };
        }
    };

    fetchAll = async (titleId: string) => {
        try {
            // Try this region first
            console.log("Trying this region");
            return await this.chooseSource(titleId);
        } catch (e) {
            // Try all other regions
            console.log("Trying all regions");
            for (let regionKey in REGION) {
                try {
                    return await this.chooseSource(titleId, (<any>REGION)[regionKey]);
                } catch (e) {
                }
            }
            return cheerio.load("");
        }
    };

    fetchHeaderImage = async (titleId: string) => {
        const {horizontalHeaderImage} = await this.fetchAll(titleId);
        return horizontalHeaderImage;
    };

    fetchDescriptionImage = async (titleId: string) => {
        const {descriptionImage} = await this.fetchAll(titleId);
        return descriptionImage;
    };

    fetchBoxart = async (titleId: string) => {
        const {boxart} = await this.fetchAll(titleId);
        return boxart;
    };

    fetchScreenshots = async (titleId: string) => {
        const {galleryImages} = await this.fetchAll(titleId);
        return galleryImages;
    };
}