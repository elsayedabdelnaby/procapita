/**
 * Format date to dd-mm-yyyy hh:mm AM/PM format
 * @param date - Date string or Date object
 * @returns Formatted date string in dd-mm-yyyy hh:mm AM/PM format
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    
    let dateObj: Date;
    
    // Handle different date string formats
    if (typeof date === 'string') {
        // If it's in format "Y-m-d H:i:s" or "Y-m-d\TH:i:s", parse it correctly
        if (date.includes('T') || date.includes(' ')) {
            // Replace space with T for ISO parsing, or use as-is
            const normalizedDate = date.includes(' ') ? date.replace(' ', 'T') : date;
            dateObj = new Date(normalizedDate);
        } else {
            dateObj = new Date(date);
        }
    } else {
        dateObj = date;
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
        return '-';
    }
    
    // Use local time methods to avoid timezone issues
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    // Format time in 12-hour format with AM/PM using local time
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours); // No padding for hours
    
    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}

