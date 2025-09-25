export const Colors = {
  light: {
    // base
    background: '#ffffff',        
    foreground: '#252525',        
    // surfaces
    card: '#ffffff',           
    cardForeground: '#252525',   
    popover: '#ffffff',
    popoverForeground: '#252525',
    // brand
    primary: '#343434',         
    primaryForeground: '#fbfbfb',
    // subtle
    secondary: '#f7f7f7',        
    secondaryForeground: '#343434',
    muted: '#f7f7f7',
    mutedForeground: '#8f8f8f',
    accent: '#f7f7f7',
    accentForeground: '#343434',
    // states
    destructive: '#c74a3a',      
    destructiveForeground: '#c74a3a',
    // inputs & borders
    border: '#ebebeb',         
    input: '#ebebeb',
    ring: '#b3b3b3',          
    // charts
    chart1: '#b87333',            
    chart2: '#6fb6ff',         
    chart3: '#7080ff',            
    chart4: '#ffd166',            
    chart5: '#ff9f6e',           
    // sidebar
    sidebar: '#fbfbfb',                   
    sidebarForeground: '#252525',
    sidebarPrimary: '#343434',
    sidebarPrimaryForeground: '#fbfbfb',
    sidebarAccent: '#f7f7f7',
    sidebarAccentForeground: '#343434',
    sidebarBorder: '#ebebeb',
    sidebarRing: '#b3b3b3',
  },

  dark: {
    // base
    background: '#252525',        
    foreground: '#fbfbfb',      
    // surfaces
    card: '#252525',
    cardForeground: '#fbfbfb',
    popover: '#252525',
    popoverForeground: '#fbfbfb',
    // brand
    primary: '#fbfbfb',         
    primaryForeground: '#343434', 
    // subtle
    secondary: '#454545',       
    secondaryForeground: '#fbfbfb',
    muted: '#454545',
    mutedForeground: '#b3b3b3',   
    accent: '#454545',
    accentForeground: '#fbfbfb',
    // states
    destructive: '#7a3a2f',       
    destructiveForeground: '#a75e4f', 
    // inputs & borders
    border: '#454545',
    input: '#454545',
    ring: '#6f6f6f',              
    // charts
    chart1: '#6f6ce6',            
    chart2: '#7bdcb5',            
    chart3: '#ff9f6e',           
    chart4: '#c87dff',            
    chart5: '#ffd4a3',            
    // sidebar
    sidebar: '#343434',                   
    sidebarForeground: '#fbfbfb',
    sidebarPrimary: '#6f6ce6',           
    sidebarPrimaryForeground: '#fbfbfb',
    sidebarAccent: '#454545',
    sidebarAccentForeground: '#fbfbfb',
    sidebarBorder: '#454545',
    sidebarRing: '#6f6f6f',
  },
} as const;


export const Radii = {
  sm: 6,   
  md: 8,   
  lg: 10,  
  xl: 14,  
} as const;

export type ThemeColorName = keyof typeof Colors['light'] & keyof typeof Colors['dark'];

