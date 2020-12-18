import Fetcher from "./index";

const main = async () => {
    const fetcher = new Fetcher("US");
    const url = await fetcher.fetchAll("01006BB00C6F0000");
    console.log("Header Image:", url)
};

main();