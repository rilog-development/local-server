const getSlugName = (appName: string) => {
    return appName.toLowerCase().replace(/ /g, "-");
}

export { getSlugName }
