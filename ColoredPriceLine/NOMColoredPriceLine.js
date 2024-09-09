class NOMColoredPriceLine {

    map(d, i, history) {
        if (i == history.data.length - 1) {
            return d.value();
        } else {
            return;
        }

    }
}

module.exports = {
    name: "NOM Colored Price Line",
    description: "NOM Colored Price Line",
    calculator: NOMColoredPriceLine,
    tags: ["NOM Tools"],
    schemeStyles: {
        dark: {
            _: {
                color: "#8cecff",
                opacity: 0
            }
        }
    }
};
