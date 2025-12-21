/**
 * Format date to dd-mm-yyyy hh:mm AM/PM format
 * @param date - Date string or Date object
 * @returns Formatted date string in dd-mm-yyyy hh:mm AM/PM format
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
        return '-';
    }
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    // Format time in 12-hour format with AM/PM
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours); // No padding for hours
    
    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}

