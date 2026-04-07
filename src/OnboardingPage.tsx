import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowRight, Check, ChevronLeft, User, Building2, Globe, Briefcase,
    Phone, Mail, Sparkles, Package, TrendingUp, Zap, Users, Camera, Edit3,
    Sun, Moon
} from 'lucide-react';
import { supabase } from './supabaseClient';

interface UserProfile {
    name: string;
    companyName: string;
    phone: string;
    email: string;
    country: string;
    jobRole: string;
    categorySpecialization: string;
    yearlyEstRevenue: string;
}

interface OnboardingPageProps {
    user: any;
    onComplete: (data: Partial<UserProfile>) => Promise<void>;
    isLoading: boolean;
    onThemeChange?: (dark: boolean) => void;
}

// ─── All 195 countries ────────────────────────────────────────────────────────
const COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola',
    'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
    'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
    'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
    'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile',
    'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'DR Congo',
    'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
    'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
    'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
    'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
    'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
    'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
    'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
    'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
    'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
    'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
    'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
    'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
    'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
    'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
    'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
    'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
    'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay',
    'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
    'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
    'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia',
    'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
    'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
    'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan',
    'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
    'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
    'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
    'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States of America', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
    'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

// ─── Country → dial code + flag ───────────────────────────────────────────────
const DIAL: Record<string, { code: string; flag: string }> = {
    'Afghanistan': { code: '+93', flag: '🇦🇫' },
    'Albania': { code: '+355', flag: '🇦🇱' },
    'Algeria': { code: '+213', flag: '🇩🇿' },
    'Andorra': { code: '+376', flag: '🇦🇩' },
    'Angola': { code: '+244', flag: '🇦🇴' },
    'Antigua and Barbuda': { code: '+1-268', flag: '🇦🇬' },
    'Argentina': { code: '+54', flag: '🇦🇷' },
    'Armenia': { code: '+374', flag: '🇦🇲' },
    'Australia': { code: '+61', flag: '🇦🇺' },
    'Austria': { code: '+43', flag: '🇦🇹' },
    'Azerbaijan': { code: '+994', flag: '🇦🇿' },
    'Bahamas': { code: '+1-242', flag: '🇧🇸' },
    'Bahrain': { code: '+973', flag: '🇧🇭' },
    'Bangladesh': { code: '+880', flag: '🇧🇩' },
    'Barbados': { code: '+1-246', flag: '🇧🇧' },
    'Belarus': { code: '+375', flag: '🇧🇾' },
    'Belgium': { code: '+32', flag: '🇧🇪' },
    'Belize': { code: '+501', flag: '🇧🇿' },
    'Benin': { code: '+229', flag: '🇧🇯' },
    'Bhutan': { code: '+975', flag: '🇧🇹' },
    'Bolivia': { code: '+591', flag: '🇧🇴' },
    'Bosnia and Herzegovina': { code: '+387', flag: '🇧🇦' },
    'Botswana': { code: '+267', flag: '🇧🇼' },
    'Brazil': { code: '+55', flag: '🇧🇷' },
    'Brunei': { code: '+673', flag: '🇧🇳' },
    'Bulgaria': { code: '+359', flag: '🇧🇬' },
    'Burkina Faso': { code: '+226', flag: '🇧🇫' },
    'Burundi': { code: '+257', flag: '🇧🇮' },
    'Cabo Verde': { code: '+238', flag: '🇨🇻' },
    'Cambodia': { code: '+855', flag: '🇰🇭' },
    'Cameroon': { code: '+237', flag: '🇨🇲' },
    'Canada': { code: '+1', flag: '🇨🇦' },
    'Central African Republic': { code: '+236', flag: '🇨🇫' },
    'Chad': { code: '+235', flag: '🇹🇩' },
    'Chile': { code: '+56', flag: '🇨🇱' },
    'China': { code: '+86', flag: '🇨🇳' },
    'Colombia': { code: '+57', flag: '🇨🇴' },
    'Comoros': { code: '+269', flag: '🇰🇲' },
    'Congo': { code: '+242', flag: '🇨🇬' },
    'Costa Rica': { code: '+506', flag: '🇨🇷' },
    'Croatia': { code: '+385', flag: '🇭🇷' },
    'Cuba': { code: '+53', flag: '🇨🇺' },
    'Cyprus': { code: '+357', flag: '🇨🇾' },
    'Czech Republic': { code: '+420', flag: '🇨🇿' },
    'DR Congo': { code: '+243', flag: '🇨🇩' },
    'Denmark': { code: '+45', flag: '🇩🇰' },
    'Djibouti': { code: '+253', flag: '🇩🇯' },
    'Dominica': { code: '+1-767', flag: '🇩🇲' },
    'Dominican Republic': { code: '+1-809', flag: '🇩🇴' },
    'Ecuador': { code: '+593', flag: '🇪🇨' },
    'Egypt': { code: '+20', flag: '🇪🇬' },
    'El Salvador': { code: '+503', flag: '🇸🇻' },
    'Equatorial Guinea': { code: '+240', flag: '🇬🇶' },
    'Eritrea': { code: '+291', flag: '🇪🇷' },
    'Estonia': { code: '+372', flag: '🇪🇪' },
    'Eswatini': { code: '+268', flag: '🇸🇿' },
    'Ethiopia': { code: '+251', flag: '🇪🇹' },
    'Fiji': { code: '+679', flag: '🇫🇯' },
    'Finland': { code: '+358', flag: '🇫🇮' },
    'France': { code: '+33', flag: '🇫🇷' },
    'Gabon': { code: '+241', flag: '🇬🇦' },
    'Gambia': { code: '+220', flag: '🇬🇲' },
    'Georgia': { code: '+995', flag: '🇬🇪' },
    'Germany': { code: '+49', flag: '🇩🇪' },
    'Ghana': { code: '+233', flag: '🇬🇭' },
    'Greece': { code: '+30', flag: '🇬🇷' },
    'Grenada': { code: '+1-473', flag: '🇬🇩' },
    'Guatemala': { code: '+502', flag: '🇬🇹' },
    'Guinea': { code: '+224', flag: '🇬🇳' },
    'Guinea-Bissau': { code: '+245', flag: '🇬🇼' },
    'Guyana': { code: '+592', flag: '🇬🇾' },
    'Haiti': { code: '+509', flag: '🇭🇹' },
    'Honduras': { code: '+504', flag: '🇭🇳' },
    'Hungary': { code: '+36', flag: '🇭🇺' },
    'Iceland': { code: '+354', flag: '🇮🇸' },
    'India': { code: '+91', flag: '🇮🇳' },
    'Indonesia': { code: '+62', flag: '🇮🇩' },
    'Iran': { code: '+98', flag: '🇮🇷' },
    'Iraq': { code: '+964', flag: '🇮🇶' },
    'Ireland': { code: '+353', flag: '🇮🇪' },
    'Israel': { code: '+972', flag: '🇮🇱' },
    'Italy': { code: '+39', flag: '🇮🇹' },
    'Jamaica': { code: '+1-876', flag: '🇯🇲' },
    'Japan': { code: '+81', flag: '🇯🇵' },
    'Jordan': { code: '+962', flag: '🇯🇴' },
    'Kazakhstan': { code: '+7', flag: '🇰🇿' },
    'Kenya': { code: '+254', flag: '🇰🇪' },
    'Kiribati': { code: '+686', flag: '🇰🇮' },
    'Kuwait': { code: '+965', flag: '🇰🇼' },
    'Kyrgyzstan': { code: '+996', flag: '🇰🇬' },
    'Laos': { code: '+856', flag: '🇱🇦' },
    'Latvia': { code: '+371', flag: '🇱🇻' },
    'Lebanon': { code: '+961', flag: '🇱🇧' },
    'Lesotho': { code: '+266', flag: '🇱🇸' },
    'Liberia': { code: '+231', flag: '🇱🇷' },
    'Libya': { code: '+218', flag: '🇱🇾' },
    'Liechtenstein': { code: '+423', flag: '🇱🇮' },
    'Lithuania': { code: '+370', flag: '🇱🇹' },
    'Luxembourg': { code: '+352', flag: '🇱🇺' },
    'Madagascar': { code: '+261', flag: '🇲🇬' },
    'Malawi': { code: '+265', flag: '🇲🇼' },
    'Malaysia': { code: '+60', flag: '🇲🇾' },
    'Maldives': { code: '+960', flag: '🇲🇻' },
    'Mali': { code: '+223', flag: '🇲🇱' },
    'Malta': { code: '+356', flag: '🇲🇹' },
    'Marshall Islands': { code: '+692', flag: '🇲🇭' },
    'Mauritania': { code: '+222', flag: '🇲🇷' },
    'Mauritius': { code: '+230', flag: '🇲🇺' },
    'Mexico': { code: '+52', flag: '🇲🇽' },
    'Micronesia': { code: '+691', flag: '🇫🇲' },
    'Moldova': { code: '+373', flag: '🇲🇩' },
    'Monaco': { code: '+377', flag: '🇲🇨' },
    'Mongolia': { code: '+976', flag: '🇲🇳' },
    'Montenegro': { code: '+382', flag: '🇲🇪' },
    'Morocco': { code: '+212', flag: '🇲🇦' },
    'Mozambique': { code: '+258', flag: '🇲🇿' },
    'Myanmar': { code: '+95', flag: '🇲🇲' },
    'Namibia': { code: '+264', flag: '🇳🇦' },
    'Nauru': { code: '+674', flag: '🇳🇷' },
    'Nepal': { code: '+977', flag: '🇳🇵' },
    'Netherlands': { code: '+31', flag: '🇳🇱' },
    'New Zealand': { code: '+64', flag: '🇳🇿' },
    'Nicaragua': { code: '+505', flag: '🇳🇮' },
    'Niger': { code: '+227', flag: '🇳🇪' },
    'Nigeria': { code: '+234', flag: '🇳🇬' },
    'North Korea': { code: '+850', flag: '🇰🇵' },
    'North Macedonia': { code: '+389', flag: '🇲🇰' },
    'Norway': { code: '+47', flag: '🇳🇴' },
    'Oman': { code: '+968', flag: '🇴🇲' },
    'Pakistan': { code: '+92', flag: '🇵🇰' },
    'Palau': { code: '+680', flag: '🇵🇼' },
    'Palestine': { code: '+970', flag: '🇵🇸' },
    'Panama': { code: '+507', flag: '🇵🇦' },
    'Papua New Guinea': { code: '+675', flag: '🇵🇬' },
    'Paraguay': { code: '+595', flag: '🇵🇾' },
    'Peru': { code: '+51', flag: '🇵🇪' },
    'Philippines': { code: '+63', flag: '🇵🇭' },
    'Poland': { code: '+48', flag: '🇵🇱' },
    'Portugal': { code: '+351', flag: '🇵🇹' },
    'Qatar': { code: '+974', flag: '🇶🇦' },
    'Romania': { code: '+40', flag: '🇷🇴' },
    'Russia': { code: '+7', flag: '🇷🇺' },
    'Rwanda': { code: '+250', flag: '🇷🇼' },
    'Saint Kitts and Nevis': { code: '+1-869', flag: '🇰🇳' },
    'Saint Lucia': { code: '+1-758', flag: '🇱🇨' },
    'Saint Vincent and the Grenadines': { code: '+1-784', flag: '🇻🇨' },
    'Samoa': { code: '+685', flag: '🇼🇸' },
    'San Marino': { code: '+378', flag: '🇸🇲' },
    'São Tomé and Príncipe': { code: '+239', flag: '🇸🇹' },
    'Saudi Arabia': { code: '+966', flag: '🇸🇦' },
    'Senegal': { code: '+221', flag: '🇸🇳' },
    'Serbia': { code: '+381', flag: '🇷🇸' },
    'Seychelles': { code: '+248', flag: '🇸🇨' },
    'Sierra Leone': { code: '+232', flag: '🇸🇱' },
    'Singapore': { code: '+65', flag: '🇸🇬' },
    'Slovakia': { code: '+421', flag: '🇸🇰' },
    'Slovenia': { code: '+386', flag: '🇸🇮' },
    'Solomon Islands': { code: '+677', flag: '🇸🇧' },
    'Somalia': { code: '+252', flag: '🇸🇴' },
    'South Africa': { code: '+27', flag: '🇿🇦' },
    'South Korea': { code: '+82', flag: '🇰🇷' },
    'South Sudan': { code: '+211', flag: '🇸🇸' },
    'Spain': { code: '+34', flag: '🇪🇸' },
    'Sri Lanka': { code: '+94', flag: '🇱🇰' },
    'Sudan': { code: '+249', flag: '🇸🇩' },
    'Suriname': { code: '+597', flag: '🇸🇷' },
    'Sweden': { code: '+46', flag: '🇸🇪' },
    'Switzerland': { code: '+41', flag: '🇨🇭' },
    'Syria': { code: '+963', flag: '🇸🇾' },
    'Taiwan': { code: '+886', flag: '🇹🇼' },
    'Tajikistan': { code: '+992', flag: '🇹🇯' },
    'Tanzania': { code: '+255', flag: '🇹🇿' },
    'Thailand': { code: '+66', flag: '🇹🇭' },
    'Timor-Leste': { code: '+670', flag: '🇹🇱' },
    'Togo': { code: '+228', flag: '🇹🇬' },
    'Tonga': { code: '+676', flag: '🇹🇴' },
    'Trinidad and Tobago': { code: '+1-868', flag: '🇹🇹' },
    'Tunisia': { code: '+216', flag: '🇹🇳' },
    'Turkey': { code: '+90', flag: '🇹🇷' },
    'Turkmenistan': { code: '+993', flag: '🇹🇲' },
    'Tuvalu': { code: '+688', flag: '🇹🇻' },
    'Uganda': { code: '+256', flag: '🇺🇬' },
    'Ukraine': { code: '+380', flag: '🇺🇦' },
    'United Arab Emirates': { code: '+971', flag: '🇦🇪' },
    'United Kingdom': { code: '+44', flag: '🇬🇧' },
    'United States of America': { code: '+1', flag: '🇺🇸' },
    'Uruguay': { code: '+598', flag: '🇺🇾' },
    'Uzbekistan': { code: '+998', flag: '🇺🇿' },
    'Vanuatu': { code: '+678', flag: '🇻🇺' },
    'Vatican City': { code: '+379', flag: '🇻🇦' },
    'Venezuela': { code: '+58', flag: '🇻🇪' },
    'Vietnam': { code: '+84', flag: '🇻🇳' },
    'Yemen': { code: '+967', flag: '🇾🇪' },
    'Zambia': { code: '+260', flag: '🇿🇲' },
    'Zimbabwe': { code: '+263', flag: '🇿🇼' },
};

// ─── Hello in local languages ─────────────────────────────────────────────────
const HELLO_MAP: Record<string, { word: string; romanized?: string; language: string }> = {
    'Afghanistan': { word: 'سلام', romanized: 'Salaam', language: 'Dari' },
    'Albania': { word: 'Përshëndetje', language: 'Albanian' },
    'Algeria': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Andorra': { word: 'Hola', language: 'Catalan' },
    'Angola': { word: 'Olá', language: 'Portuguese' },
    'Antigua and Barbuda': { word: 'Hello', language: 'English' },
    'Argentina': { word: 'Hola', language: 'Spanish' },
    'Armenia': { word: 'Բարև', romanized: 'Barev', language: 'Armenian' },
    'Australia': { word: "G'day", language: 'English' },
    'Austria': { word: 'Servus', language: 'Austrian German' },
    'Azerbaijan': { word: 'Salam', language: 'Azerbaijani' },
    'Bahamas': { word: 'Hello', language: 'English' },
    'Bahrain': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Bangladesh': { word: 'নমস্কার', romanized: 'Nomoshkar', language: 'Bengali' },
    'Barbados': { word: 'Hello', language: 'English' },
    'Belarus': { word: 'Прывітанне', romanized: 'Pryvitannie', language: 'Belarusian' },
    'Belgium': { word: 'Bonjour', language: 'French' },
    'Belize': { word: 'Hello', language: 'English' },
    'Benin': { word: 'Bonjour', language: 'French' },
    'Bhutan': { word: 'Kuzu Zangpo', language: 'Dzongkha' },
    'Bolivia': { word: 'Hola', language: 'Spanish' },
    'Bosnia and Herzegovina': { word: 'Zdravo', language: 'Bosnian' },
    'Botswana': { word: 'Dumela', language: 'Setswana' },
    'Brazil': { word: 'Olá', language: 'Portuguese' },
    'Brunei': { word: 'Halo', language: 'Malay' },
    'Bulgaria': { word: 'Здравей', romanized: 'Zdravey', language: 'Bulgarian' },
    'Burkina Faso': { word: 'Bonjour', language: 'French' },
    'Burundi': { word: 'Bonjour', language: 'French' },
    'Cabo Verde': { word: 'Olá', language: 'Portuguese' },
    'Cambodia': { word: 'ជំរាបសួរ', romanized: 'Chumreap suor', language: 'Khmer' },
    'Cameroon': { word: 'Bonjour', language: 'French' },
    'Canada': { word: 'Hello', language: 'English' },
    'Central African Republic': { word: 'Bonjour', language: 'French' },
    'Chad': { word: 'Bonjour', language: 'French' },
    'Chile': { word: 'Hola', language: 'Spanish' },
    'China': { word: '你好', romanized: 'Nǐ hǎo', language: 'Mandarin' },
    'Colombia': { word: 'Hola', language: 'Spanish' },
    'Comoros': { word: 'Bonjour', language: 'French' },
    'Congo': { word: 'Bonjour', language: 'French' },
    'Costa Rica': { word: 'Hola', language: 'Spanish' },
    'Croatia': { word: 'Bok', language: 'Croatian' },
    'Cuba': { word: 'Hola', language: 'Spanish' },
    'Cyprus': { word: 'Γεια σου', romanized: 'Yia sou', language: 'Greek' },
    'Czech Republic': { word: 'Ahoj', language: 'Czech' },
    'DR Congo': { word: 'Bonjour', language: 'French' },
    'Denmark': { word: 'Hej', language: 'Danish' },
    'Djibouti': { word: 'Bonjour', language: 'French' },
    'Dominica': { word: 'Hello', language: 'English' },
    'Dominican Republic': { word: 'Hola', language: 'Spanish' },
    'Ecuador': { word: 'Hola', language: 'Spanish' },
    'Egypt': { word: 'أهلاً', romanized: 'Ahlan', language: 'Arabic' },
    'El Salvador': { word: 'Hola', language: 'Spanish' },
    'Equatorial Guinea': { word: 'Hola', language: 'Spanish' },
    'Eritrea': { word: 'ሰላም', romanized: 'Selam', language: 'Tigrinya' },
    'Estonia': { word: 'Tere', language: 'Estonian' },
    'Eswatini': { word: 'Sawubona', language: 'Swazi' },
    'Ethiopia': { word: 'ሰላም', romanized: 'Selam', language: 'Amharic' },
    'Fiji': { word: 'Bula', language: 'Fijian' },
    'Finland': { word: 'Hei', language: 'Finnish' },
    'France': { word: 'Bonjour', language: 'French' },
    'Gabon': { word: 'Bonjour', language: 'French' },
    'Gambia': { word: 'Hello', language: 'English' },
    'Georgia': { word: 'გამარჯობა', romanized: 'Gamarjoba', language: 'Georgian' },
    'Germany': { word: 'Hallo', language: 'German' },
    'Ghana': { word: 'Akwaaba', language: 'Akan' },
    'Greece': { word: 'Γεια σου', romanized: 'Yia sou', language: 'Greek' },
    'Grenada': { word: 'Hello', language: 'English' },
    'Guatemala': { word: 'Hola', language: 'Spanish' },
    'Guinea': { word: 'Bonjour', language: 'French' },
    'Guinea-Bissau': { word: 'Olá', language: 'Portuguese' },
    'Guyana': { word: 'Hello', language: 'English' },
    'Haiti': { word: 'Bonjou', language: 'Haitian Creole' },
    'Honduras': { word: 'Hola', language: 'Spanish' },
    'Hungary': { word: 'Szia', language: 'Hungarian' },
    'Iceland': { word: 'Halló', language: 'Icelandic' },
    'India': { word: 'नमस्ते', romanized: 'Namaste', language: 'Hindi' },
    'Indonesia': { word: 'Halo', language: 'Indonesian' },
    'Iran': { word: 'سلام', romanized: 'Salaam', language: 'Persian' },
    'Iraq': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Ireland': { word: 'Dia dhuit', language: 'Irish' },
    'Israel': { word: 'שָׁלוֹם', romanized: 'Shalom', language: 'Hebrew' },
    'Italy': { word: 'Ciao', language: 'Italian' },
    'Jamaica': { word: 'Wah gwaan', language: 'Patois' },
    'Japan': { word: 'こんにちは', romanized: 'Konnichiwa', language: 'Japanese' },
    'Jordan': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Kazakhstan': { word: 'Сәлем', romanized: 'Salem', language: 'Kazakh' },
    'Kenya': { word: 'Jambo', language: 'Swahili' },
    'Kiribati': { word: 'Hello', language: 'English' },
    'Kuwait': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Kyrgyzstan': { word: 'Салам', romanized: 'Salam', language: 'Kyrgyz' },
    'Laos': { word: 'ສະບາຍດີ', romanized: 'Sabaidee', language: 'Lao' },
    'Latvia': { word: 'Sveiki', language: 'Latvian' },
    'Lebanon': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Lesotho': { word: 'Lumela', language: 'Sesotho' },
    'Liberia': { word: 'Hello', language: 'English' },
    'Libya': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Liechtenstein': { word: 'Hallo', language: 'German' },
    'Lithuania': { word: 'Labas', language: 'Lithuanian' },
    'Luxembourg': { word: 'Moien', language: 'Luxembourgish' },
    'Madagascar': { word: 'Manao ahoana', language: 'Malagasy' },
    'Malawi': { word: 'Moni', language: 'Chichewa' },
    'Malaysia': { word: 'Helo', language: 'Malay' },
    'Maldives': { word: 'ހެލޯ', romanized: 'Hello', language: 'Dhivehi' },
    'Mali': { word: 'Bonjour', language: 'French' },
    'Malta': { word: 'Bonġu', language: 'Maltese' },
    'Marshall Islands': { word: 'Iakwe', language: 'Marshallese' },
    'Mauritania': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Mauritius': { word: 'Bonjour', language: 'French' },
    'Mexico': { word: 'Hola', language: 'Spanish' },
    'Micronesia': { word: 'Hello', language: 'English' },
    'Moldova': { word: 'Bună', language: 'Romanian' },
    'Monaco': { word: 'Bonjour', language: 'French' },
    'Mongolia': { word: 'Сайн уу', romanized: 'Sain uu', language: 'Mongolian' },
    'Montenegro': { word: 'Zdravo', language: 'Montenegrin' },
    'Morocco': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Mozambique': { word: 'Olá', language: 'Portuguese' },
    'Myanmar': { word: 'မင်္ဂလာပါ', romanized: 'Mingalarbar', language: 'Burmese' },
    'Namibia': { word: 'Hallo', language: 'Afrikaans' },
    'Nauru': { word: 'Ekamawir', language: 'Nauruan' },
    'Nepal': { word: 'नमस्ते', romanized: 'Namaste', language: 'Nepali' },
    'Netherlands': { word: 'Hallo', language: 'Dutch' },
    'New Zealand': { word: 'Kia ora', language: 'Māori' },
    'Nicaragua': { word: 'Hola', language: 'Spanish' },
    'Niger': { word: 'Bonjour', language: 'French' },
    'Nigeria': { word: 'Nno', language: 'Igbo' },
    'North Korea': { word: '안녕하세요', romanized: 'Annyeonghaseyo', language: 'Korean' },
    'North Macedonia': { word: 'Здраво', romanized: 'Zdravo', language: 'Macedonian' },
    'Norway': { word: 'Hei', language: 'Norwegian' },
    'Oman': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Pakistan': { word: 'آداب', romanized: 'Aadaab', language: 'Urdu' },
    'Palau': { word: 'Alii', language: 'Palauan' },
    'Palestine': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Panama': { word: 'Hola', language: 'Spanish' },
    'Papua New Guinea': { word: 'Hello', language: 'English' },
    'Paraguay': { word: 'Mba\'éichapa', language: 'Guaraní' },
    'Peru': { word: 'Hola', language: 'Spanish' },
    'Philippines': { word: 'Kamusta', language: 'Filipino' },
    'Poland': { word: 'Cześć', romanized: "Cheshch", language: 'Polish' },
    'Portugal': { word: 'Olá', language: 'Portuguese' },
    'Qatar': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Romania': { word: 'Bună', language: 'Romanian' },
    'Russia': { word: 'Привет', romanized: 'Privet', language: 'Russian' },
    'Rwanda': { word: 'Muraho', language: 'Kinyarwanda' },
    'Saint Kitts and Nevis': { word: 'Hello', language: 'English' },
    'Saint Lucia': { word: 'Hello', language: 'English' },
    'Saint Vincent and the Grenadines': { word: 'Hello', language: 'English' },
    'Samoa': { word: 'Talofa', language: 'Samoan' },
    'San Marino': { word: 'Ciao', language: 'Italian' },
    'São Tomé and Príncipe': { word: 'Olá', language: 'Portuguese' },
    'Saudi Arabia': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Senegal': { word: 'Bonjour', language: 'French' },
    'Serbia': { word: 'Zdravo', language: 'Serbian' },
    'Seychelles': { word: 'Bonjour', language: 'French' },
    'Sierra Leone': { word: 'Hello', language: 'English' },
    'Singapore': { word: '你好', romanized: 'Nǐ hǎo', language: 'Mandarin' },
    'Slovakia': { word: 'Ahoj', language: 'Slovak' },
    'Slovenia': { word: 'Zdravo', language: 'Slovenian' },
    'Solomon Islands': { word: 'Hello', language: 'English' },
    'Somalia': { word: 'Salaan', language: 'Somali' },
    'South Africa': { word: 'Sawubona', language: 'Zulu' },
    'South Korea': { word: '안녕하세요', romanized: 'Annyeonghaseyo', language: 'Korean' },
    'South Sudan': { word: 'Hello', language: 'English' },
    'Spain': { word: 'Hola', language: 'Spanish' },
    'Sri Lanka': { word: 'ආයුබෝවන්', romanized: 'Ayubowan', language: 'Sinhala' },
    'Sudan': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Suriname': { word: 'Hallo', language: 'Dutch' },
    'Sweden': { word: 'Hej', language: 'Swedish' },
    'Switzerland': { word: 'Grüezi', language: 'Swiss German' },
    'Syria': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Taiwan': { word: '你好', romanized: 'Nǐ hǎo', language: 'Mandarin' },
    'Tajikistan': { word: 'Салом', romanized: 'Salom', language: 'Tajik' },
    'Tanzania': { word: 'Jambo', language: 'Swahili' },
    'Thailand': { word: 'สวัสดี', romanized: 'Sawasdee', language: 'Thai' },
    'Timor-Leste': { word: 'Olá', language: 'Portuguese' },
    'Togo': { word: 'Bonjour', language: 'French' },
    'Tonga': { word: 'Mālō e lelei', language: 'Tongan' },
    'Trinidad and Tobago': { word: 'Hello', language: 'English' },
    'Tunisia': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Turkey': { word: 'Merhaba', language: 'Turkish' },
    'Turkmenistan': { word: 'Salam', language: 'Turkmen' },
    'Tuvalu': { word: 'Hello', language: 'English' },
    'Uganda': { word: 'Oli otya', language: 'Luganda' },
    'Ukraine': { word: 'Привіт', romanized: 'Pryvit', language: 'Ukrainian' },
    'United Arab Emirates': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'United Kingdom': { word: 'Hello', language: 'English' },
    'United States of America': { word: 'Hello', language: 'English' },
    'Uruguay': { word: 'Hola', language: 'Spanish' },
    'Uzbekistan': { word: 'Salom', language: 'Uzbek' },
    'Vanuatu': { word: 'Hello', language: 'English' },
    'Vatican City': { word: 'Ciao', language: 'Italian' },
    'Venezuela': { word: 'Hola', language: 'Spanish' },
    'Vietnam': { word: 'Xin chào', language: 'Vietnamese' },
    'Yemen': { word: 'مرحبا', romanized: 'Marhaba', language: 'Arabic' },
    'Zambia': { word: 'Muli bwanji', language: 'Nyanja' },
    'Zimbabwe': { word: 'Mhoro', language: 'Shona' },
};

const JOB_ROLES = [
    'Owner / Founder',
    'CEO / President',
    'Sourcing Manager',
    'Product Manager',
    'Designer / Creative Director',
    'Supply Chain Manager',
    'Brand Manager',
    'Buyer',
    'Other',
];

const CATEGORIES = [
    'Activewear & Sportswear', 'Denim & Bottoms', 'Tops & Shirts',
    'Outerwear & Jackets', 'Swimwear & Beachwear', 'Intimates & Loungewear',
    'Formal & Suiting', 'Kidswear & Babywear', 'Knitwear & Sweaters',
    'Athleisure', 'Accessories', 'Footwear',
    'Workwear', 'Sustainable Fashion', 'Luxury & Couture', 'Casual & Streetwear',
];

// ─── Image resize helper ──────────────────────────────────────────────────────
function resizeImage(file: File, maxPx = 240): Promise<string> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.src = e.target!.result as string;
        };
        reader.readAsDataURL(file);
    });
}

// ─── Onboarding background image columns (same source as login page) ─────────
const ONBOARDING_BG_COLS: string[][] = [
    [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1542178243-bc20fd5a9d04?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
    ],
    [
        'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1617137968427-85250d5cc462?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1523381210434-271e8be8a52b?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1474176857626-96cdcc8a9f2a?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1516762069907-f5b9dd38f73c?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
    ],
    [
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1513956589380-4a8ea3e5bd9d?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
        'https://images.unsplash.com/photo-1529391409740-59f1b9e6c408?w=340&h=480&fit=crop&crop=faces,top&q=72&auto=format',
    ],
];

// ─── Floating Orb Background ──────────────────────────────────────────────────
const FloatingOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, background: 'radial-gradient(circle,rgba(194,12,11,0.18) 0%,transparent 70%)', borderRadius: '50%', animation: 'orbFloat1 18s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 600, height: 600, background: 'radial-gradient(circle,rgba(194,12,11,0.10) 0%,transparent 70%)', borderRadius: '50%', animation: 'orbFloat2 22s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle,rgba(251,191,36,0.06) 0%,transparent 70%)', borderRadius: '50%', animation: 'orbFloat3 15s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
);

// ─── Step Bar ─────────────────────────────────────────────────────────────────
const StepBar = ({ current, isMobile }: { current: number; isMobile?: boolean }) => {
    const steps = [
        { label: 'Welcome', icon: Sparkles },
        { label: 'Personal', icon: User },
        { label: 'Business', icon: Building2 },
        { label: 'Expertise', icon: Briefcase },
        { label: 'Theme', icon: Sun },
        { label: 'Done', icon: Check },
    ];
    const circleSize = isMobile ? 28 : 34;
    const iconSize = isMobile ? 12 : 15;
    const connectorW = isMobile ? 14 : 36;
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: isMobile ? 20 : 36 }}>
            {steps.map((step, i) => {
                const Icon = step.icon;
                const done = i < current;
                const active = i === current;
                const isLast = i === steps.length - 1;
                return (
                    <React.Fragment key={i}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 4 : 6 }}>
                            <div style={{
                                width: circleSize, height: circleSize, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                                background: done ? 'linear-gradient(135deg,#c20c0b,#ff4040)' : active ? 'rgba(194,12,11,0.15)' : 'rgba(255,255,255,0.05)',
                                border: active ? '2px solid #c20c0b' : done ? '2px solid transparent' : '2px solid rgba(255,255,255,0.12)',
                                boxShadow: active ? '0 0 16px rgba(194,12,11,0.4)' : done ? '0 0 12px rgba(194,12,11,0.3)' : 'none',
                                flexShrink: 0,
                            }}>
                                <Icon size={iconSize} color={done || active ? (done ? '#fff' : '#c20c0b') : 'rgba(255,255,255,0.3)'} strokeWidth={2.5} />
                            </div>
                            {!isMobile && (
                                <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? '#fff' : done ? 'rgba(194,12,11,0.9)' : 'rgba(255,255,255,0.22)', fontWeight: active ? 700 : 500, transition: 'color 0.3s' }}>{step.label}</span>
                            )}
                        </div>
                        {!isLast && <div style={{ height: 2, width: connectorW, marginBottom: isMobile ? 0 : 20, background: i < current ? 'linear-gradient(90deg,#c20c0b,#ff4040)' : 'rgba(255,255,255,0.08)', transition: 'background 0.4s', borderRadius: 1, flexShrink: 0 }} />}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ─── Field label ──────────────────────────────────────────────────────────────
const FieldLabel = ({ label, required }: { label: string; required?: boolean }) => (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 7 }}>
        {label}{required && <span style={{ color: '#c20c0b', marginLeft: 2 }}>*</span>}
    </div>
);

// ─── Input row style helper ───────────────────────────────────────────────────
const inputRowStyle = (focused: boolean, hasValue: boolean, readOnly?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    background: readOnly ? 'rgba(255,255,255,0.03)' : focused ? 'rgba(194,12,11,0.06)' : 'rgba(255,255,255,0.05)',
    border: `1.5px solid ${focused ? '#c20c0b' : hasValue ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 12, padding: '0 14px',
    transition: 'border-color 0.25s, background 0.25s',
    boxShadow: focused ? '0 0 0 3px rgba(194,12,11,0.10)' : 'none',
});

const inputStyle = (readOnly?: boolean): React.CSSProperties => ({
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    paddingTop: 13, paddingBottom: 13,
    color: readOnly ? 'rgba(255,255,255,0.45)' : '#fff',
    fontSize: 15, fontWeight: 500, cursor: readOnly ? 'default' : 'text', minWidth: 0,
});

// ─── Elegant Input ────────────────────────────────────────────────────────────
const ElegantInput = ({ label, type = 'text', value, onChange, placeholder, required, readOnly, icon: Icon }: {
    label: string; type?: string; value: string; onChange?: (v: string) => void;
    placeholder?: string; required?: boolean; readOnly?: boolean; icon?: any;
}) => {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ marginBottom: 4 }}>
            <FieldLabel label={label} required={required && !readOnly} />
            <div style={inputRowStyle(focused, value.length > 0, readOnly)}>
                {Icon && <Icon size={15} style={{ flexShrink: 0 }} color={focused ? '#c20c0b' : 'rgba(255,255,255,0.28)'} />}
                <input type={type} value={value} onChange={e => onChange?.(e.target.value)}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    readOnly={readOnly} placeholder={placeholder ?? label}
                    style={inputStyle(readOnly)} />
            </div>
        </div>
    );
};

// ─── Phone Input with auto country code ──────────────────────────────────────
const formatPhoneDigits = (val: string) => {
    const d = val.replace(/\D/g, '');
    if (d.length <= 4) return d;
    if (d.length <= 8) return d.slice(0, 4) + '-' + d.slice(4);
    return d.slice(0, 4) + '-' + d.slice(4, 8) + '-' + d.slice(8, 12);
};

const PhoneInput = ({ country, value, onChange }: { country: string; value: string; onChange: (v: string) => void }) => {
    const [focused, setFocused] = useState(false);
    const dial = country ? DIAL[country] : null;

    return (
        <div style={{ marginBottom: 4 }}>
            <FieldLabel label="Phone Number" required />
            <div style={{ ...inputRowStyle(focused, value.length > 0), padding: 0, overflow: 'hidden' }}>
                {/* Flag + code badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 12px', height: '100%', minHeight: 48,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    flexShrink: 0, cursor: 'default',
                }}>
                    {dial ? (
                        <>
                            <span style={{ fontSize: 18, lineHeight: 1 }}>{dial.flag}</span>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600, whiteSpace: 'nowrap' }}>{dial.code}</span>
                        </>
                    ) : (
                        <Phone size={15} color="rgba(255,255,255,0.28)" />
                    )}
                </div>
                <input
                    type="tel"
                    value={value}
                    onChange={e => onChange(formatPhoneDigits(e.target.value))}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={dial ? `0000-0000-0000` : 'Select a country first'}
                    style={{ ...inputStyle(), paddingLeft: 12, paddingRight: 14 }}
                />
            </div>
        </div>
    );
};

// ─── Elegant Select ───────────────────────────────────────────────────────────
const ElegantSelect = ({ label, value, onChange, options, icon: Icon, required }: {
    label: string; value: string; onChange: (v: string) => void; options: string[]; icon?: any; required?: boolean;
}) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div ref={ref} style={{ position: 'relative', marginBottom: 4 }}>
            <FieldLabel label={label} required={required} />
            <div onClick={() => setOpen(!open)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: open ? 'rgba(194,12,11,0.06)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${open ? '#c20c0b' : value ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: open ? '12px 12px 0 0' : 12, padding: '13px 14px', cursor: 'pointer',
                transition: 'all 0.25s', boxShadow: open ? '0 0 0 3px rgba(194,12,11,0.10)' : 'none', userSelect: 'none',
            }}>
                {Icon && <Icon size={15} style={{ flexShrink: 0 }} color={open ? '#c20c0b' : 'rgba(255,255,255,0.28)'} />}
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: value ? '#fff' : 'rgba(255,255,255,0.3)', minWidth: 0 }}>
                    {value || `Select ${label}`}
                </span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"
                    style={{ flexShrink: 0, transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.25s' }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>
            {open && (
                <div style={{
                    position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 200,
                    background: 'rgba(20,20,26,0.98)', border: '1.5px solid rgba(194,12,11,0.55)',
                    borderRadius: 14, maxHeight: 260, overflowY: 'auto',
                    boxShadow: '0 24px 56px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset',
                    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    animation: 'dropDown 0.16s cubic-bezier(0.16,1,0.3,1)',
                    transformOrigin: 'top',
                }}>
                    {options.length > 8 && (
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, background: 'rgba(20,20,26,0.98)', backdropFilter: 'blur(20px)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '6px 10px' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                                    onClick={e => e.stopPropagation()}
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, outline: 'none' }} />
                            </div>
                        </div>
                    )}
                    <div style={{ padding: '4px 0' }}>
                        {filtered.map(opt => (
                            <div key={opt} onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                                style={{ padding: '9px 16px', color: opt === value ? '#ff6b6b' : 'rgba(255,255,255,0.78)', fontWeight: opt === value ? 600 : 400, fontSize: 14, cursor: 'pointer', background: opt === value ? 'rgba(194,12,11,0.10)' : 'transparent', transition: 'background 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, margin: '1px 4px' }}
                                onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = opt === value ? 'rgba(194,12,11,0.10)' : 'transparent'; }}>
                                {opt}
                                {opt === value && <Check size={13} color="#c20c0b" strokeWidth={2.5} />}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ padding: '16px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>No results for "{query}"</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Category Chip ────────────────────────────────────────────────────────────
const CategoryChip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} style={{
        padding: '8px 14px', borderRadius: 100,
        border: `1.5px solid ${selected ? '#c20c0b' : 'rgba(255,255,255,0.1)'}`,
        background: selected ? 'linear-gradient(135deg,rgba(194,12,11,0.25),rgba(194,12,11,0.12))' : 'rgba(255,255,255,0.04)',
        color: selected ? '#ff6b6b' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: selected ? 600 : 400,
        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: selected ? '0 0 12px rgba(194,12,11,0.25)' : 'none', letterSpacing: '0.01em',
    }}>
        {selected && <span style={{ marginRight: 5 }}>✓</span>}{label}
    </button>
);

// ─── Avatar Picker ────────────────────────────────────────────────────────────
const AvatarPicker = ({ user, avatarUrl, onChange, isMobile }: {
    user: any; avatarUrl: string; onChange: (url: string) => void; isMobile?: boolean;
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [fromGoogle, setFromGoogle] = useState(false);

    // Auto-fetch Google profile picture on mount
    useEffect(() => {
        const googlePic = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
        if (googlePic && !avatarUrl) {
            onChange(googlePic);
            setFromGoogle(true);
        }
    }, []);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const resized = await resizeImage(file, 240);
            onChange(resized);
            setFromGoogle(false);
            // Persist to Supabase auth metadata
            await supabase.auth.updateUser({ data: { avatar_url: resized } });
        } finally {
            setUploading(false);
        }
        // Reset so same file can be re-picked
        e.target.value = '';
    };

    const initials = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '?')
        .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: isMobile ? 16 : 28 }}>
            {/* Avatar circle */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#c20c0b,#7a0808)',
                    border: '2.5px solid rgba(194,12,11,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', position: 'relative',
                    boxShadow: '0 0 24px rgba(194,12,11,0.25), 0 4px 16px rgba(0,0,0,0.5)',
                }}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{initials}</span>
                    )}
                    {/* Hover overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: uploading ? 1 : 0, transition: 'opacity 0.2s',
                        borderRadius: '50%',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => !uploading && (e.currentTarget.style.opacity = '0')}
                    >
                        {uploading
                            ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            : <Camera size={20} color="#fff" />}
                    </div>
                </div>
                {/* Edit badge */}
                <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#c20c0b,#9a0909)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #0c0c0f',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}>
                    <Edit3 size={11} color="#fff" />
                </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    {uploading ? 'Uploading…' : 'Click to change photo'}
                </span>
                {fromGoogle && (
                    <span style={{
                        fontSize: 11, color: '#60a5fa', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                        <svg width="10" height="10" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        Auto-fetched from Google
                    </span>
                )}
            </div>
        </div>
    );
};

// ─── Main Onboarding Component ────────────────────────────────────────────────
export const OnboardingPage: React.FC<OnboardingPageProps> = ({ user, onComplete, isLoading, onThemeChange }) => {
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const [animating, setAnimating] = useState(false);
    const [showingHello, setShowingHello] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const firstName = user?.user_metadata?.full_name?.split(' ')[0]
        || user?.user_metadata?.name?.split(' ')[0]
        || user?.email?.split('@')[0]
        || 'there';

    const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('dark');

    const [form, setForm] = useState({
        avatarUrl: '',
        name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
        email: user?.email || '',
        companyName: '',
        country: '',
        phone: '',
        jobRole: '',
        customRole: '',
        categories: [] as string[],
    });

    const TOTAL_STEPS = 6;

    // Disable browser back button on step 0
    useEffect(() => {
        if (step !== 0) return;
        // Push twice so the first back press stays on the same URL instead of leaving
        window.history.pushState(null, '', window.location.href);
        window.history.pushState(null, '', window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, '', window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [step]);

    const goTo = (next: number) => {
        if (animating) return;
        setDirection(next > step ? 'forward' : 'back');
        setAnimating(true);
        setTimeout(() => { setStep(next); setAnimating(false); }, 270);
    };

    // Auto-set phone prefix when country changes
    const handleCountryChange = (country: string) => {
        const dial = DIAL[country];
        setForm(p => ({
            ...p,
            country,
            // Only set prefix if phone is empty or was already a pure dial-code prefix
            phone: p.phone === '' || Object.values(DIAL).some(d => d.code === p.phone) ? '' : p.phone,
        }));
    };

    const toggleCategory = (cat: string) => {
        setForm(p => {
            if (p.categories.includes(cat)) return { ...p, categories: p.categories.filter(c => c !== cat) };
            if (p.categories.length >= 4) return p;
            return { ...p, categories: [...p.categories, cat] };
        });
    };

    const handleComplete = () => {
        const isDark = selectedTheme === 'dark';
        localStorage.setItem('garment_erp_dark_mode', String(isDark));
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        onThemeChange?.(isDark);
        // Persist to Supabase so preference syncs across all devices
        supabase.auth.updateUser({ data: { darkMode: isDark } });

        // Show hello animation, then save profile and enter platform
        setShowingHello(true);
        setTimeout(async () => {
            const finalRole = form.jobRole === 'Other' ? form.customRole : form.jobRole;
            const dialPrefix = form.country && DIAL[form.country] ? DIAL[form.country].code + ' ' : '';
            const fullPhone = form.phone ? `${dialPrefix}${form.phone}` : '';
            await onComplete({
                name: form.name, email: form.email, phone: fullPhone,
                companyName: form.companyName, country: form.country,
                jobRole: finalRole, categorySpecialization: form.categories.join(', '),
            });
        }, 4000);
    };

    const isStepValid = () => {
        if (step === 1) return form.name.trim().length > 1;
        if (step === 2) {
            const roleOk = form.jobRole === 'Other' ? form.customRole.trim().length > 0 : form.jobRole.length > 0;
            return form.companyName.trim().length > 0 && form.country.length > 0 && form.phone.trim().length > 5 && roleOk;
        }
        return true;
    };

    const slideStyle = (): React.CSSProperties => ({
        opacity: animating ? 0 : 1,
        transform: animating ? (direction === 'forward' ? 'translateX(20px)' : 'translateX(-20px)') : 'translateX(0)',
        transition: 'opacity 0.27s ease, transform 0.27s ease',
    });

    const renderStep = () => {
        // ── Step 0: Welcome ──────────────────────────────────────────────────
        if (step === 0) return (
            <div style={{ ...slideStyle(), display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: isMobile ? 58 : 72, height: isMobile ? 58 : 72, borderRadius: isMobile ? 16 : 20, background: 'linear-gradient(135deg,#c20c0b,#7a0808)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? 16 : 24, boxShadow: '0 0 40px rgba(194,12,11,0.35),0 8px 32px rgba(0,0,0,0.5)' }}>
                    <Package size={isMobile ? 28 : 36} color="#fff" strokeWidth={1.5} />
                </div>
                <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 100, border: '1px solid rgba(194,12,11,0.4)', background: 'rgba(194,12,11,0.1)', color: '#ff6b6b', fontSize: isMobile ? 10 : 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: isMobile ? 12 : 16 }}>Auctave Exports · Welcome</span>
                <h1 style={{ fontSize: isMobile ? 30 : 40, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: isMobile ? 10 : 12, letterSpacing: '-0.03em' }}>
                    Welcome,<br /><span style={{ color: '#c20c0b' }}>{firstName}</span>
                </h1>
                <p style={{ fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.5)', maxWidth: 380, lineHeight: 1.65, marginBottom: isMobile ? 24 : 40 }}>
                    You're joining a global garment intelligence platform. Let's set up your profile — it only takes a minute.
                </p>
                <div style={{ display: 'flex', gap: isMobile ? 8 : 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: isMobile ? 28 : 44 }}>
                    {[{ icon: TrendingUp, label: 'Live Tracking' }, { icon: Users, label: 'Global Network' }, { icon: Zap, label: 'AI Sourcing' }].map(({ icon: Icon, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '6px 12px' : '7px 14px', borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? 12 : 13, fontWeight: 500 }}>
                            <Icon size={12} />{label}
                        </div>
                    ))}
                </div>
                <button onClick={() => goTo(1)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '13px 28px' : '14px 36px', borderRadius: 14, background: 'linear-gradient(135deg,#c20c0b,#9a0909)', color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(194,12,11,0.45)', transition: 'all 0.2s', letterSpacing: '-0.01em', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(194,12,11,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(194,12,11,0.45)'; }}>
                    Let's Begin <ArrowRight size={18} strokeWidth={2.5} />
                </button>
            </div>
        );

        // ── Step 1: Personal + Photo ─────────────────────────────────────────
        if (step === 1) return (
            <div style={slideStyle()}>
                <div style={{ marginBottom: isMobile ? 16 : 24 }}>
                    <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.03em' }}>Personal Details</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 13 : 14 }}>Add a photo and tell us your name.</p>
                </div>

                <AvatarPicker
                    user={user}
                    avatarUrl={form.avatarUrl}
                    onChange={url => setForm(p => ({ ...p, avatarUrl: url }))}
                    isMobile={isMobile}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
                    <ElegantInput label="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Jane Smith" required icon={User} />
                    <ElegantInput label="Email Address" value={form.email} readOnly icon={Mail} />
                </div>
                <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.02em' }}>
                    Email is pre-filled from your account and cannot be changed here.
                </p>
            </div>
        );

        // ── Step 2: Business + Phone ─────────────────────────────────────────
        if (step === 2) return (
            <div style={slideStyle()}>
                <div style={{ marginBottom: isMobile ? 14 : 24 }}>
                    <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.03em' }}>Your Business</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 13 : 14 }}>Tell us about your company so we can match you with the right factories.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
                    <ElegantInput label="Company Name" value={form.companyName} onChange={v => setForm(p => ({ ...p, companyName: v }))} placeholder="Acme Fashion Co." required icon={Building2} />
                    <ElegantSelect label="Country / Region" value={form.country} onChange={handleCountryChange} options={COUNTRIES} icon={Globe} required />
                    <PhoneInput country={form.country} value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
                    <ElegantSelect label="Your Role" value={form.jobRole} onChange={v => setForm(p => ({ ...p, jobRole: v, customRole: v !== 'Other' ? '' : p.customRole }))} options={JOB_ROLES} icon={Briefcase} required />
                    {/* Custom role field — appears when "Other" is selected */}
                    {form.jobRole === 'Other' && (
                        <div style={{ animation: 'fadeDown 0.22s ease' }}>
                            <ElegantInput label="Specify Your Role" value={form.customRole} onChange={v => setForm(p => ({ ...p, customRole: v }))} placeholder="e.g. Textile Consultant" required icon={Edit3} />
                        </div>
                    )}
                </div>
            </div>
        );

        // ── Step 3: Expertise (categories only) ──────────────────────────────
        if (step === 3) return (
            <div style={slideStyle()}>
                <div style={{ marginBottom: isMobile ? 14 : 24 }}>
                    <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.03em' }}>Your Expertise</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 13 : 14 }}>Select your garment categories (up to 4) — we'll tailor your factory matches.</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Specialization</span>
                    <span style={{ fontSize: 11, color: form.categories.length >= 4 ? '#ff6b6b' : 'rgba(255,255,255,0.25)' }}>{form.categories.length}/4 selected</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CATEGORIES.map(cat => (
                        <CategoryChip key={cat} label={cat} selected={form.categories.includes(cat)} onClick={() => toggleCategory(cat)} />
                    ))}
                </div>
            </div>
        );

        // ── Step 4: Theme Selection ──────────────────────────────────────────
        if (step === 4) return (
            <div style={{ ...slideStyle(), display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                    <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.03em' }}>Choose Your Theme</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 13 : 14 }}>Pick how you'd like the platform to look. You can always change this later.</p>
                </div>
                <div style={{ display: 'flex', gap: isMobile ? 16 : 24, justifyContent: 'center', width: '100%' }}>
                    {([
                        { id: 'light' as const, label: 'Light', Icon: Sun, bg: 'linear-gradient(135deg,#f5f5f0,#e8e8e0)', iconColor: '#f59e0b', desc: 'Clean & bright' },
                        { id: 'dark' as const, label: 'Dark', Icon: Moon, bg: 'linear-gradient(135deg,#1a1a2e,#0c0c16)', iconColor: '#a78bfa', desc: 'Easy on the eyes' },
                    ] as const).map(({ id, label, Icon, bg, iconColor, desc }) => {
                        const isSelected = selectedTheme === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setSelectedTheme(id)}
                                style={{
                                    flex: 1, maxWidth: isMobile ? 140 : 180,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 12 : 16,
                                    padding: isMobile ? '20px 16px' : '28px 24px',
                                    borderRadius: 18, border: isSelected ? '2px solid #c20c0b' : '2px solid rgba(255,255,255,0.1)',
                                    background: isSelected ? 'rgba(194,12,11,0.08)' : 'rgba(255,255,255,0.04)',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    boxShadow: isSelected ? '0 0 0 4px rgba(194,12,11,0.15), 0 4px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
                                    outline: 'none',
                                }}
                                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.border = '2px solid rgba(255,255,255,0.22)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; } }}
                                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.border = '2px solid rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                            >
                                <div style={{
                                    width: isMobile ? 64 : 80, height: isMobile ? 64 : 80,
                                    borderRadius: 18, background: bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                    transition: 'transform 0.2s',
                                    transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                                }}>
                                    <Icon size={isMobile ? 28 : 34} color={iconColor} strokeWidth={1.8} />
                                </div>
                                <div>
                                    <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{label}</div>
                                    <div style={{ fontSize: isMobile ? 11 : 12, color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
                                </div>
                                {isSelected && (
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#c20c0b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(194,12,11,0.5)' }}>
                                        <Check size={12} color="#fff" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );

        // ── Step 5: All Done ─────────────────────────────────────────────────
        if (step === 5) return (
            <div style={{ ...slideStyle(), textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Avatar or checkmark */}
                <div style={{ position: 'relative', marginBottom: 24 }}>
                    <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: '2.5px solid rgba(194,12,11,0.5)', boxShadow: '0 0 40px rgba(194,12,11,0.35)', animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)', background: form.avatarUrl ? 'transparent' : 'linear-gradient(135deg,#c20c0b,#7a0808)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {form.avatarUrl
                            ? <img src={form.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Check size={44} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#c20c0b,#9a0909)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0c0c0f', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                        <Check size={14} color="#fff" strokeWidth={3} />
                    </div>
                </div>

                <h2 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    You're all set,<br /><span style={{ color: '#c20c0b' }}>{firstName}!</span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: isMobile ? 13 : 15, maxWidth: 340, lineHeight: 1.65, marginBottom: isMobile ? 20 : 32 }}>
                    Your profile is ready. You now have full access to Auctave's global factory network and AI-powered sourcing.
                </p>

                {/* Summary */}
                <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 22px', marginBottom: 32, textAlign: 'left' }}>
                    {[
                        { label: 'Name', value: form.name },
                        { label: 'Company', value: form.companyName },
                        { label: 'Country', value: form.country ? `${DIAL[form.country]?.flag ?? ''} ${form.country}` : '' },
                        { label: 'Role', value: form.jobRole === 'Other' ? form.customRole : form.jobRole },
                        ...(form.categories.length > 0 ? [{ label: 'Focus', value: form.categories.slice(0, 2).join(', ') + (form.categories.length > 2 ? ` +${form.categories.length - 2}` : '') }] : []),
                    ].map(({ label, value }) => value ? (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>{label}</span>
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{value}</span>
                        </div>
                    ) : null)}
                </div>

                <button onClick={handleComplete} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px 44px', borderRadius: 14, width: '100%',
                    background: 'linear-gradient(135deg,#c20c0b,#9a0909)', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
                    cursor: 'pointer', boxShadow: '0 4px 24px rgba(194,12,11,0.45)', transition: 'all 0.2s',
                }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(194,12,11,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(194,12,11,0.45)'; }}>
                    <>Enter Dashboard <ArrowRight size={18} strokeWidth={2.5} /></>
                </button>
            </div>
        );
        return null;
    };

    // ── Hello splash screen ──────────────────────────────────────────────────
    if (showingHello) {
        const helloData = HELLO_MAP[form.country] || { word: 'Hello', language: 'English' };
        const flag = DIAL[form.country]?.flag ?? '';
        const showRomanized = helloData.romanized && helloData.romanized !== helloData.word;
        const isDark = selectedTheme === 'dark';

        // Theme-aware colours
        const bg = isDark ? '#06060a' : '#f5f3ef';
        const bgGradient = isDark
            ? 'linear-gradient(135deg, rgba(194,12,11,0.08) 0%, transparent 45%, rgba(255,80,0,0.06) 100%)'
            : 'linear-gradient(135deg, rgba(194,12,11,0.06) 0%, transparent 45%, rgba(255,140,0,0.08) 100%)';
        const subColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
        const langColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)';

        return (
            <>
                <style>{`
                    @keyframes helloWord { 0%{opacity:0;transform:scale(0.55) translateY(24px)} 20%{opacity:1;transform:scale(1.06) translateY(0)} 32%{transform:scale(1)} 70%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.1) translateY(-16px)} }
                    @keyframes helloSub { 0%,15%{opacity:0;transform:translateY(12px)} 32%{opacity:1;transform:translateY(0)} 70%{opacity:1} 100%{opacity:0} }
                    @keyframes helloFlag { 0%{opacity:0;transform:scale(0.4)} 22%{opacity:1;transform:scale(1.12)} 32%{transform:scale(1)} 70%{opacity:1} 100%{opacity:0} }
                    @keyframes helloScreen { 0%{opacity:0} 6%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
                    @keyframes helloPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
                `}</style>
                <div style={{
                    position: 'fixed', inset: 0, background: bg,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99999, animation: 'helloScreen 4.2s ease forwards', overflow: 'hidden',
                }}>
                    {/* Diagonal gradient sweep */}
                    <div style={{ position: 'absolute', inset: 0, background: bgGradient, pointerEvents: 'none' }} />

                    {/* Ambient glow orbs */}
                    <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: isMobile ? 320 : 520, height: isMobile ? 320 : 520, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(194,12,11,0.18) 0%,transparent 65%)', animation: 'helloPulse 2s ease-in-out infinite', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: isMobile ? 240 : 380, height: isMobile ? 240 : 380, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(255,100,0,0.12) 0%,transparent 65%)', animation: 'helloPulse 2.6s ease-in-out infinite 0.8s', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: isMobile ? 180 : 300, height: isMobile ? 180 : 300, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(201,165,78,0.10) 0%,transparent 65%)', animation: 'helloPulse 3s ease-in-out infinite 1.2s', pointerEvents: 'none' }} />

                    {/* Flag */}
                    {flag && (
                        <div style={{ fontSize: isMobile ? 52 : 72, lineHeight: 1, marginBottom: isMobile ? 20 : 28, animation: 'helloFlag 4.2s ease forwards', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.3))' }}>
                            {flag}
                        </div>
                    )}

                    {/* Hello word — reddish-orange gradient */}
                    <div style={{
                        fontSize: isMobile ? 72 : 110,
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        background: 'linear-gradient(135deg, #ff6b35 0%, #e63000 32%, #c20c0b 60%, #ff4500 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        animation: 'helloWord 4.2s ease forwards',
                        filter: 'drop-shadow(0 0 48px rgba(194,12,11,0.45))',
                        textAlign: 'center',
                        padding: '0 16px',
                    }}>
                        {helloData.word}
                    </div>

                    {/* Romanized pronunciation */}
                    {showRomanized && (
                        <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 600, color: subColor, marginTop: isMobile ? 10 : 14, letterSpacing: '0.04em', animation: 'helloSub 4.2s ease forwards', textAlign: 'center' }}>
                            {helloData.romanized}
                        </div>
                    )}

                    {/* Language label */}
                    <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: langColor, marginTop: isMobile ? 18 : 24, animation: 'helloSub 4.2s ease forwards', textAlign: 'center' }}>
                        {helloData.language}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <style>{`
                @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-40px) scale(1.08)} 66%{transform:translate(-20px,20px) scale(0.95)} }
                @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-40px,30px) scale(1.1)} 70%{transform:translate(20px,-20px) scale(0.92)} }
                @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-15px,25px)} }
                @keyframes spin { to{transform:rotate(360deg)} }
                @keyframes popIn { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
                @keyframes confettiFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
                @keyframes helloWord { 0%{opacity:0;transform:scale(0.6) translateY(20px)} 18%{opacity:1;transform:scale(1.06) translateY(0)} 28%{transform:scale(1)} 72%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.08) translateY(-12px)} }
                @keyframes helloSub { 0%,12%{opacity:0;transform:translateY(10px)} 28%{opacity:1;transform:translateY(0)} 72%{opacity:1} 100%{opacity:0} }
                @keyframes helloScreen { 0%{opacity:0} 8%{opacity:1} 82%{opacity:1} 100%{opacity:0} }
                @keyframes helloPulse { 0%,100%{box-shadow:0 0 80px rgba(194,12,11,0.25),0 0 160px rgba(255,80,0,0.1)} 50%{box-shadow:0 0 120px rgba(194,12,11,0.4),0 0 240px rgba(255,80,0,0.2)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
                @keyframes scrollUp { 0%{transform:translateY(0)} 100%{transform:translateY(-50%)} }
                @keyframes scrollDown { 0%{transform:translateY(-50%)} 100%{transform:translateY(0)} }
                @keyframes orbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.72;transform:scale(1.06)} }
                @keyframes dropDown { from{opacity:0;transform:translateY(-6px) scaleY(0.96)} to{opacity:1;transform:translateY(0) scaleY(1)} }
            `}</style>

            <div style={{ position: 'fixed', inset: 0, background: '#06060a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, overflowY: 'auto', padding: isMobile ? '12px 8px' : '24px 16px' }}>

                {/* ── Scrolling photo background — rotated for quirky diagonal feel ── */}
                <div style={{ position: 'fixed', top: '-12%', left: '-12%', right: '-12%', bottom: '-12%', overflow: 'hidden', pointerEvents: 'none', transform: 'rotate(-5deg) scale(1.18)', transformOrigin: 'center center' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 4 }}>
                        {ONBOARDING_BG_COLS.map((col, colIdx) => (
                            <div key={colIdx} style={{ flex: [2, 3, 2][colIdx] as number, overflow: 'hidden', position: 'relative' }}>
                                <div style={{
                                    animation: `${colIdx === 1 ? 'scrollDown' : 'scrollUp'} ${34 + colIdx * 9}s linear infinite`,
                                    animationDelay: `${colIdx * -10}s`,
                                }}>
                                    {[...col, ...col].map((url, imgIdx) => (
                                        <img key={imgIdx} src={url} alt="" loading="lazy"
                                            style={{ width: '100%', height: 310, objectFit: 'cover', display: 'block', filter: `blur(${colIdx === 1 ? 7 : 5}px) saturate(1.3) brightness(0.75)` }} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Dark overlay ── */}
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,10,0.72)', pointerEvents: 'none' }} />
                {/* ── Diagonal colour sweep ── */}
                <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, rgba(194,12,11,0.08) 0%, transparent 45%, rgba(201,165,78,0.06) 100%)', pointerEvents: 'none' }} />

                {/* ── Ambient orbs ── */}
                <div style={{ position: 'fixed', top: '-18%', left: '-8%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(194,12,11,0.22) 0%, transparent 70%)', animation: 'orbPulse 9s ease-in-out infinite', pointerEvents: 'none' }} />
                <div style={{ position: 'fixed', bottom: '-18%', right: '-8%', width: '50%', height: '50%', background: 'radial-gradient(ellipse, rgba(201,165,78,0.16) 0%, transparent 70%)', animation: 'orbPulse 13s ease-in-out infinite 3.5s', pointerEvents: 'none' }} />
                <div style={{ position: 'fixed', top: '50%', left: '50%', width: '38%', height: '38%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse, rgba(120,40,200,0.10) 0%, transparent 70%)', filter: 'blur(24px)', pointerEvents: 'none' }} />

                <div style={{
                    position: 'relative', width: '100%', maxWidth: step === 3 ? 660 : 560,
                    background: 'rgba(12,12,16,0.92)', backdropFilter: 'blur(36px)', WebkitBackdropFilter: 'blur(36px)',
                    border: '1px solid rgba(255,255,255,0.09)', borderRadius: isMobile ? 20 : 28,
                    padding: step === 0
                        ? (isMobile ? '36px 22px' : '60px 56px')
                        : (isMobile ? '28px 20px' : '44px 56px'),
                    boxShadow: '0 48px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 80px rgba(194,12,11,0.05) inset',
                    animation: 'fadeUp 0.5s ease both', zIndex: 1,
                    transition: 'max-width 0.3s ease',
                }}>
                    {/* Top shimmer */}
                    <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(194,12,11,0.6),rgba(255,100,100,0.4),transparent)', borderRadius: 1 }} />

                    {step > 0 && step < 5 && <StepBar current={step} isMobile={isMobile} />}

                    <div style={{ overflow: step === 3 ? 'visible' : 'hidden' }}>
                        {renderStep()}
                    </div>

                    {/* Nav footer for steps 1–4 */}
                    {step >= 1 && step <= 4 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: isMobile ? 18 : 26, paddingTop: isMobile ? 14 : 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button onClick={() => goTo(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '8px 12px' : '9px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? 13 : 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                                <ChevronLeft size={14} /> Back
                            </button>

                            <div style={{ display: 'flex', gap: 5 }}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? '#c20c0b' : i < step ? 'rgba(194,12,11,0.4)' : 'rgba(255,255,255,0.12)', transition: 'all 0.3s' }} />
                                ))}
                            </div>

                            <button onClick={() => goTo(step + 1)} disabled={!isStepValid()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '8px 16px' : '9px 20px', borderRadius: 10, background: isStepValid() ? 'linear-gradient(135deg,#c20c0b,#9a0909)' : 'rgba(255,255,255,0.05)', border: 'none', color: isStepValid() ? '#fff' : 'rgba(255,255,255,0.22)', fontSize: isMobile ? 13 : 14, fontWeight: 700, cursor: isStepValid() ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: isStepValid() ? '0 2px 12px rgba(194,12,11,0.35)' : 'none' }}
                                onMouseEnter={e => { if (isStepValid()) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(194,12,11,0.5)'; } }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isStepValid() ? '0 2px 12px rgba(194,12,11,0.35)' : 'none'; }}>
                                {step === 4 ? 'Review' : 'Continue'} <ArrowRight size={14} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}

                    <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)' }} />
                </div>

                <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 11.5, letterSpacing: '0.04em' }}>
                    Auctave Exports · Secure & Private
                </div>
            </div>
        </>
    );
};
