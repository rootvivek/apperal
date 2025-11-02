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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      
      {isLoading ? (
        <div className="px-6 py-8 text-center text-gray-500">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
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
                      className="px-6 py-4 text-sm text-gray-900"
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
