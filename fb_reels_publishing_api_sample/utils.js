function convertToUnix(raw_date){
    const [dateComponents, timeComponents] = raw_date.split('T');

    const [year, month, day] = dateComponents.split('-');
    const [hours, minutes] = timeComponents.split(':');

    const date = new Date(+year, month - 1, +day, +hours, +minutes);

    return Math.floor(date.getTime() / 1000)
}

module.exports = convertToUnix;