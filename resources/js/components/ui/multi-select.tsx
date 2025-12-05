import * as React from "react"
import { X, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
    value: string | number
    label: string
}

interface MultiSelectProps {
    options: MultiSelectOption[]
    value: (string | number)[]
    onChange: (value: (string | number)[]) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    searchable?: boolean
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Select items...",
    className,
    disabled = false,
    searchable = true,
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchTerm("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const selectedOptions = options.filter((option) => value.includes(option.value))

    const filteredOptions = searchable
        ? options.filter((option) =>
              option.label.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : options

    const toggleOption = (optionValue: string | number) => {
        if (disabled) return

        const newValue = value.includes(optionValue)
            ? value.filter((v) => v !== optionValue)
            : [...value, optionValue]

        onChange(newValue)
    }

    const removeOption = (optionValue: string | number, e: React.MouseEvent) => {
        e.stopPropagation()
        if (disabled) return
        onChange(value.filter((v) => v !== optionValue))
    }

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    disabled && "cursor-not-allowed opacity-50",
                    !disabled && "cursor-pointer"
                )}
            >
                <div className="flex flex-wrap gap-1.5">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map((option) => (
                            <span
                                key={option.value}
                                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                                {option.label}
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => removeOption(option.value, e)}
                                        className="ml-1 rounded-sm hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        ))
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isOpen && "rotate-180"
                        )}
                    />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                    {searchable && (
                        <div className="border-b p-2">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="max-h-60 overflow-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No options found
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = value.includes(option.value)
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => toggleOption(option.value)}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                            isSelected && "bg-accent"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            <div
                                                className={cn(
                                                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-background"
                                                )}
                                            >
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                            <span>{option.label}</span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

