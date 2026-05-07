import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../ui/popover';
import { countries } from '../../../lib/countries';

const PhoneInput = ({ value = '', onChange, placeholder = "Enter phone number", className, defaultCountry = "IN", disabled = false }) => {
  const [open, setOpen] = useState(false);
  
  // Parse initial value (expected format: "+code number")
  const parseValue = (val) => {
    if (!val) return { country: countries.find(c => c.code === defaultCountry) || countries[0], number: '' };
    
    // Find the longest matching phone prefix
    const sortedCountries = [...countries].sort((a, b) => b.phone.length - a.phone.length);
    for (const c of sortedCountries) {
      if (val.startsWith(`+${c.phone}`)) {
        return {
          country: c,
          number: val.replace(`+${c.phone}`, '').trim()
        };
      }
    }
    
    return { country: countries.find(c => c.code === defaultCountry) || countries[0], number: val };
  };

  const initialParsed = parseValue(value);
  const [selectedCountry, setSelectedCountry] = useState(initialParsed.country);
  const [phoneNumber, setPhoneNumber] = useState(initialParsed.number);

  useEffect(() => {
    const newVal = `+${selectedCountry.phone}${phoneNumber}`;
    if (newVal !== value) {
      onChange(newVal);
    }
  }, [selectedCountry, phoneNumber]);

  const handleNumberChange = (e) => {
    const val = e.target.value.replace(/[^\d]/g, ''); // Only allow digits
    setPhoneNumber(val);
  };

  return (
    <div className={cn("flex gap-0 rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-10 px-3 rounded-none rounded-l-md border-r flex shrink-0 items-center gap-1 hover:bg-muted disabled:opacity-50"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-medium text-muted-foreground">+{selectedCountry.phone}</span>
            <ChevronsUpDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country code..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.phone}`}
                    onSelect={() => {
                      setSelectedCountry(country);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2 text-lg">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-muted-foreground">+{country.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none rounded-r-md h-10"
      />
    </div>
  );
};

export default PhoneInput;
