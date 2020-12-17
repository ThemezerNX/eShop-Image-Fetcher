import Fetcher from "./index";

const main = async () => {
    console.log("TESTING..........");
    const fetcher = new Fetcher("US");
    const data = await fetcher.fetch("01007EF00011E000");
    console.log(data)
};

main();