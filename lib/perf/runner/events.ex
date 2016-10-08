defmodule Perf.Runner.Events do
  defprotocol Encoder do
    @fallback_to_any true
    def to_row(s)
  end

  defmodule Success do
    defstruct start_t: 0,
      end_t: 0,
      size: 0,
      request: :none,
      status: :none
  end

  defimpl Encoder, for: Success do
    @whitelist [:start_t, :end_t, :size, :status]
    def to_row(s) do
      Perf.Runner.Events.take_struct(s, @whitelist)
      |> Map.put("request_id", s.request.id)
    end
  end

  defmodule Error do
    defstruct reason: :none,
      status: :none,
      request: :none,
      start_t: 0,
      end_t: 0
  end

  defmodule StartingRequest do
    defstruct at: 0,
      request: :none,
      concurrency: 0,
      ref: :none
  end

  defmodule Done do
    defstruct at: 0,
      ref: :none
  end


  defimpl Encoder, for: Any do
    def to_row(s) do
      whitelist = Map.keys(s)
      Perf.Runner.Events.take_struct(s, whitelist)
    end
  end

  defp to_ms(m) do
    m
    |> Enum.map(fn
      {k, v} when k in [:start_t, :end_t, :at] -> {k, Yams.key_to_ms(v)}
      other -> other
    end)
  end

  def take_struct(s, whitelist) do
    type = s.__struct__
    |> Atom.to_string
    |> String.split(".")
    |> List.last
    |> String.downcase

    s
    |> Map.from_struct
    |> Map.take(whitelist)
    |> Map.put(:type, type)
    |> to_ms
    |> Enum.map(fn {k, v} -> {Atom.to_string(k), v} end)
    |> Enum.into(%{})
  end

  def to_row(s) do
    Encoder.to_row(s)
  end

  def timeof(%Success{} = s), do: s.end_t
  def timeof(%Error{} = s), do: s.end_t
  def timeof(other), do: other.at

  defimpl Poison.Encoder, for: Success do
    defdelegate encode(v, opts), to: Perf.Runner.Events
  end
  defimpl Poison.Encoder, for: Error do
    defdelegate encode(v, opts), to: Perf.Runner.Events
  end
  defimpl Poison.Encoder, for: StartingRequest do
    defdelegate encode(v, opts), to: Perf.Runner.Events
  end
  defimpl Poison.Encoder, for: Done do
    defdelegate encode(v, opts), to: Perf.Runner.Events
  end

  def encode(s, _) do
    s
    |> Encoder.to_row
    |> Poison.encode!
  end
end