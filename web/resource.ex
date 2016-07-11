defmodule Perf.Resource do
  defmodule State do
    defstruct params: nil, 
      conn: nil,
      socket: nil, 
      assigns: nil, 
      resp: nil, 
      error: nil, 
      query: nil, 
      model: nil,
      kind: :ok
  end

  defmacro __before_compile__(env) do
    stages = Module.get_attribute(env.module, :stages)
    compile_stages(env, stages)
  end


  defmacro __using__(_opts) do
    quote do
      import Perf.Resource

      def handle(model, state) do
        stage_builder(model, state)
      end

      Module.register_attribute(__MODULE__, :stages, accumulate: true)
      @before_compile Perf.Resource
      defoverridable [handle: 2]
    end
  end

  defmacro stage(stage, opts \\ []) do
    quote do
      @stages {unquote(stage), unquote(opts)} 
    end
  end

  def compile_stages(_env, stages) do
    resolved = stages
    quote do
      defp stage_builder(model, state) do
        unquote(resolved)
        |> Enum.reverse
        |> Enum.reduce(state, fn 
          {stage, args}, %State{error: nil} = state ->
            {module, args} = Keyword.pop(args, :mod, __MODULE__)
            # IO.puts "--- Running stage #{module} #{stage} #{inspect model} #{inspect state}"
            apply(module, stage, args ++ [model, state])
          _, state -> 
            state
        end)
      end
    end
  end


  def created(state, resp, params \\ %{}) do
    struct(
      state, 
      kind: :created, 
      resp: resp, 
      params: params
    )
  end

  def bad_request(state, resp) do
    struct(
      state,
      kind: :bad_request,
      error: resp
    )
  end
end

defprotocol Perf.Resource.Create do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.Read do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.Update do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.Delete do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.List do
  @fallback_to_any true
  def handle(model, state)
end
