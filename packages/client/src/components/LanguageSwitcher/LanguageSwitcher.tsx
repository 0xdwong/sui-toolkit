import React from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@chakra-ui/react";

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value;
    i18n.changeLanguage(language);
  };

  return (
    <Box>
      <select
        value={i18n.language}
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
