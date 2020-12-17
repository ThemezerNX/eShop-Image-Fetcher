import Fetcher from "./index";

const main = async () => {
    const fetcher = new Fetcher("US");
    const url = await fetcher.fetchAll("01007EF00011E000");
    console.log("Header Image:", url)
};

main();