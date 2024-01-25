const formatDate = (inputDate: Date, time = false): string => {
    const day = String(inputDate.getDate()).padStart(2, '0');
    const month = String(inputDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = inputDate.getFullYear();
    const minutes = String(inputDate.getMinutes()).padStart(2,'0');
    const hours = String(inputDate.getHours()).padStart(2, '0');
    const seconds = inputDate.getSeconds();

    return  time ? `${day}.${month}.${year} ${hours}:${minutes}:${seconds}` : `${day}.${month}.${year}`;
}

const formatTimestamp = (timestamp: string): string => {
    const date = new Date(+timestamp);

    return formatDate(date, true);
}

export { formatDate, formatTimestamp }