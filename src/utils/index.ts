const getSlugName = (appName: string) => {
    return appName.toLowerCase().replace(" ", "-");
}

export { getSlugName }