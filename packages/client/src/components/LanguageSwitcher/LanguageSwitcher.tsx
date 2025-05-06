import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@chakra-ui/react";

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  // Ensure correct language is set on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("i18nextLng");
    if (savedLanguage && i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value;
    i18n.changeLanguage(language);
    localStorage.setItem("i18nextLng", language);
    // Force document language attribute to update
    document.documentElement.lang = language;
  };

  // Extract the base language code (e.g., 'en' from 'en-US')
  const currentLanguage = i18n.language?.split('-')[0] || 'en';

  return (
    <Box>
      <select
        value={currentLanguage}
        onChange={changeLanguage}
        style={{
          padding: "0.4rem 0.8rem",
          fontSize: "0.875rem",
          borderRadius: "0.375rem",
          border: "1px solid #E2E8F0",
          background: "white",
          cursor: "pointer",
        }}
      >
        <option value="en">{t("language.en")}</option>
        <option value="zh">{t("language.zh")}</option>
      </select>
    </Box>
  );
};

export default LanguageSwitcher;
