const getSlugName = (appName: string): string => {
  return appName.toLowerCase().replace(/\s+/g, '-');
};

export { getSlugName };
