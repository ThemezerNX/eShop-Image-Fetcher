import Fetcher from "./index";

const main = async () => {
    const fetcher = new Fetcher("US");
    const url = await fetcher.fetchAll("01000D1006CEC000");
    console.log("Header Image:", url)
};

main();