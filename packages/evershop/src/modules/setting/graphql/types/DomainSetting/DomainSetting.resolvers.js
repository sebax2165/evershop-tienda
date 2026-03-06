export default {
  Setting: {
    domainCustomDomain: (setting) => {
      const domainCustomDomain = setting.find(
        (s) => s.name === 'domainCustomDomain'
      );
      if (domainCustomDomain) {
        return domainCustomDomain.value;
      } else {
        return null;
      }
    }
  }
};
