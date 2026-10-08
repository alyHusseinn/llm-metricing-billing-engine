const getExpirationDate = (startDate: Date): Date => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cycleStart = startDate.getTime();
    return new Date(cycleStart + THIRTY_DAYS_MS);
}

export default getExpirationDate;