defmodule Perf.Runner.RequestWorker do
  alias Experimental.GenStage
  use GenStage
  alias Perf.Request
  alias Perf.Yams
  require Logger
  alias Perf.Runner.Events.{Success, Error}

  @methods ["GET", "POST", "PUT", "PATCH", "DELETE"]

  def start_link(_) do
    GenStage.start_link(__MODULE__, [])
  end

  def init(_) do
    {:producer_consumer, %{}}
  end

  defp request(method, request) do
    HTTPoison.request(method, request.path, "", [], [
      timeout: request.timeout,
      recv_timeout: request.receive_timeout
    ])
  end

  defp now do
    {Yams.key, Yams.key}
  end

  defp time(func) do
    start_t = Yams.key
    result = func.()
    end_t = Yams.key

    {result, {start_t, end_t}}
  end

  Enum.each(@methods, fn method ->
    defp method_from_request(unquote(method)) do
      {:ok, String.downcase(unquote(method)) |> String.to_atom}
    end
  end)
  defp method_from_request(unknown) do
    {:error, %{key: :invalid_method, params: %{method: unknown}}}
  end

  defp on_event(%Request{} = r) do
    case method_from_request(r.method) do
      {:ok, method} ->
        {result, range} = time fn -> request(method, r) end
        {r, result, range}
      err ->
        {r, err, now()}
    end
  end

  defp on_event(ev), do: ev



  defp to_result({request, {:error, %HTTPoison.Error{reason: reason}}, range}) do
    {_, end_t} = range

    %Error{
      at: end_t,
      reason: %{
        key: :request_failed,
        params: %{
          reason: reason
        }
      },
      request: request
    }
  end

  defp to_result({request, {:error, error}, {_, end_t}}) do
    %Error{
      at: end_t,
      reason: error,
      request: request
    }
  end

  defp to_result({request, {:ok, response}, range}) do
    {start_t, end_t} = range
    %HTTPoison.Response{body: body, status_code: status} = response
    size = byte_size(body)

    %Success{
      size: size,
      start_t: start_t,
      at: end_t,
      end_t: end_t,
      status: status,
      request: request
    }
  end

  defp to_result(ev), do: ev

  def handle_events(events, _, state) do
    results = events
    |> Enum.map(fn event ->
      event
      |> on_event
      |> to_result
    end)
    {:noreply, results, state}
  end

  def handle_info({ref, {:broadcast, event}}, state) do
    GenStage.async_notify(self, {:broadcast, event})
    {:noreply, [], state}
  end

  def handle_info(_, state) do
    {:noreply, [], state}
  end


  def stop(pid) do
    :poolboy.checkin(RequestWorker, pid)
  end

end