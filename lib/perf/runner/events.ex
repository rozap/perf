defmodule Perf.Runner.Events do
  defmodule Success do
    defstruct at: 0,
      start_t: 0,
      end_t: 0,
      size: 0,
      request: :none,
      status: :none
  end

  defmodule Error do
    defstruct reason: :none,
      status: :none,
      request: :none,
      at: 0
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

  def encode(s, _) do
    type = s.__struct__
    |> Atom.to_string
    |> String.split(".")
    |> List.last
    |> String.downcase

    s
    |> Map.from_struct
    |> Map.drop([:ref])
    |> Map.put(:type, type)
    |> Poison.encode!
  end

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