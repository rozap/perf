defmodule Perf.Runner.Events do
  defmodule Success do
    defstruct start_t: 0,
      end_t: 0,
      size: 0,
      request: :none,
      status: :none
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
      ref: :none
  end

  defmodule Done do
    defstruct at: 0,
      ref: :none
  end

  defp to_ms(m) do
    m
    |> Enum.map(fn
      {k, v} when k in [:start_t, :end_t, :at] -> {k, Perf.Yams.key_to_ms(v)}
      other -> other
    end)
  end

  def to_row(s) do
    type = s.__struct__
    |> Atom.to_string
    |> String.split(".")
    |> List.last
    |> String.downcase

    s
    |> Map.from_struct
    |> Map.drop([:ref])
    |> Map.put(:type, type)
    |> to_ms
    |> Enum.map(fn {k, v} -> {Atom.to_string(k), v} end)
    |> Enum.into(%{})
  end

  def encode(s, _) do
    s
    |> to_row
    |> Poison.encode!
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
end