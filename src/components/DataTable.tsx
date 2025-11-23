interface DataTableProps {
  title?: string;
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    sortable?: boolean;
    [key: string]: any;
  }[];
  data: any[];
  emptyMessage?: string;
  rowKey?: string;
  isLoading?: boolean;
  [key: string]: any;
}

export default function DataTable({
  title,
  columns,
  data,
  emptyMessage = 'No data available',
  isLoading = false,
  onRowClick,
}: DataTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
      {title && (
        <div className="px-2 py-1 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      
      {isLoading ? (
        <div className="px-2 py-2 text-center text-gray-500 flex-shrink-0 text-xs">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="px-2 py-2 text-center text-gray-500 flex-shrink-0 text-xs">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-2 py-1 text-left text-xs font-semibold text-gray-900 bg-gray-50"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((row, index) => (
                <tr 
                  key={index} 
                  className="hover:bg-gray-50 transition-colors"
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-2 py-1 text-xs text-gray-900"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
