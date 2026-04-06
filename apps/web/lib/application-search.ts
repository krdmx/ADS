type CompanySearchable = {
  companyName: string;
};

export function doesCompanyMatchSearch<T extends CompanySearchable>(
  item: T,
  searchQuery: string
) {
  if (!searchQuery) {
    return true;
  }

  return item.companyName.toLowerCase().includes(searchQuery.toLowerCase());
}

export function sortItemsByCompanySearch<T extends CompanySearchable>(
  items: T[],
  searchQuery: string
) {
  return items
    .map((item, index) => ({
      item,
      index,
    }))
    .sort((left, right) => {
      const leftMatches = doesCompanyMatchSearch(left.item, searchQuery);
      const rightMatches = doesCompanyMatchSearch(right.item, searchQuery);

      if (leftMatches !== rightMatches) {
        return leftMatches ? -1 : 1;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}
