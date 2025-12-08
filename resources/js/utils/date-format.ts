/**
 * Format date to dd / mm / yyyy format
 * @param date - Date string or Date object
 * @returns Formatted date string in dd / mm / yyyy format
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
    
    return `${day} / ${month} / ${year}`;
}

