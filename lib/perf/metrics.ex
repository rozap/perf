defmodule Perf.Metrics do
  defmacro timer(body) do
    quote do
      start_t = System.os_time(:milliseconds)
      result = unquote(body[:do])
      end_t = System.os_time(:milliseconds)
      {result, end_t - start_t}
    end
  end
end